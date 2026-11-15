import uuid
from decimal import Decimal
from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.db.models import Q, Sum
from django.contrib.auth import get_user_model
from .models import EscrowVault, EscrowTransaction
from .serializers import (
    EscrowVaultSerializer, ReleaseEscrowSerializer,
    CancelEscrowSerializer, FundEscrowSerializer, EscrowTransactionSerializer
)
from .services import EscrowSettlementService, generate_ledger_hash
from apps.services.models import WorkerProfile
from apps.bookings.models import Booking

User = get_user_model()

class EscrowVaultListView(generics.ListCreateAPIView):
    serializer_class = EscrowVaultSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return EscrowVault.objects.filter(Q(client=user) | Q(worker=user)).distinct()

    def perform_create(self, serializer):
        ref = f"LF-ESC-{uuid.uuid4().hex[:4].upper()}"
        serializer.save(client=self.request.user, vault_reference=ref)

class EscrowVaultDetailView(generics.RetrieveAPIView):
    serializer_class = EscrowVaultSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        ref = self.kwargs.get('vault_reference')
        vault = EscrowVault.objects.filter(
            Q(vault_reference=ref) | Q(booking_code=ref)
        ).prefetch_related('transactions').first()
        if not vault:
            return get_object_or_404(EscrowVault, vault_reference=ref)
        return vault

class FundEscrowView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = FundEscrowSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        worker_id = data['worker_id']
        worker_user = None
        # Check if worker_id belongs to a WorkerProfile or User
        worker_prof = WorkerProfile.objects.filter(id=worker_id).first()
        if worker_prof:
            worker_user = worker_prof.user
        else:
            worker_user = User.objects.filter(id=worker_id).first()

        if not worker_user:
            # Fallback to the first available artisan
            worker_user = User.objects.filter(role='worker').first()

        vault_ref = f"LF-ESC-{uuid.uuid4().hex[:4].upper()}"
        booking_code = data.get('booking_code') or f"LX-{uuid.uuid4().hex[:6].upper()}"

        vault = EscrowVault.objects.create(
            vault_reference=vault_ref,
            booking_code=booking_code,
            client=request.user,
            worker=worker_user,
            total_amount=data['total_amount'],
            service_description=data.get('service_description', 'Standard Trade Diagnostics & Escrow'),
            settlement_nuban=data.get('settlement_nuban') or '0123456789 (Access Bank)',
            client_refund_nuban=data.get('client_refund_nuban') or '9876543210 (GTBank)',
            status='funded'
        )

        # Record Initial Deposit in cryptographic ledger
        tx_hash = generate_ledger_hash(vault.vault_reference, 'deposit', data['total_amount'])
        EscrowTransaction.objects.create(
            vault=vault,
            transaction_type='client_deposit',
            amount=data['total_amount'],
            recipient_nuban=data.get('payment_channel', 'Providus Virtual NUBAN'),
            ledger_hash=tx_hash,
            note=f"Client deposit locked in Escrow Trust Vault for {booking_code} via {data.get('payment_channel', 'bank').upper()}"
        )

        # If booking exists, update status
        booking = Booking.objects.filter(booking_code=booking_code).first()
        if booking:
            booking.status = 'escrow_funded'
            booking.agreed_amount = data['total_amount']
            booking.save()

        # Send Real Notifications to both parties
        try:
            from apps.authentication.models import Notification
            if worker_user:
                Notification.objects.create(
                    user=worker_user,
                    title=f"Escrow Funded: ₦{float(data['total_amount']):,.2f}",
                    body=f"{request.user.full_name or 'Client'} has funded Escrow Vault {vault.vault_reference} for '{vault.service_description}'. Funds are guaranteed.",
                    notification_type='escrow',
                    action_url=f"/profile?tab=wallet"
                )
            Notification.objects.create(
                user=request.user,
                title=f"Escrow Vault Locked: {vault.vault_reference}",
                body=f"Your payment of ₦{float(data['total_amount']):,.2f} is safely locked in Providus Escrow. Funds are only released upon your inspection signoff.",
                notification_type='escrow',
                action_url=f"/profile?tab=wallet"
            )
        except Exception:
            pass

        return Response({
            'message': 'Escrow successfully funded and locked in CBN-regulated Trust Vault!',
            'vault': EscrowVaultSerializer(vault).data,
            'ledger_hash': tx_hash,
            'vault_reference': vault.vault_reference,
            'booking_code': booking.booking_code if booking else booking_code
        }, status=status.HTTP_201_CREATED)

class ReleaseEscrowView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, vault_reference):
        vault = EscrowVault.objects.filter(Q(vault_reference=vault_reference) | Q(booking_code=vault_reference)).first()
        if not vault:
            return Response({'error': 'Vault not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = ReleaseEscrowSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        otp = serializer.validated_data['otp']
        if len(otp) < 4:
            return Response({'error': 'Invalid 4-digit security OTP.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            result = EscrowSettlementService.process_final_release(vault.id)
            # Update associated booking if exists
            if vault.booking_code:
                Booking.objects.filter(booking_code=vault.booking_code).update(status='completed')

            try:
                from apps.authentication.models import Notification
                if vault.worker:
                    Notification.objects.create(
                        user=vault.worker,
                        title="Escrow Funds Released! 💸",
                        body=f"Client released funds for vault {vault.vault_reference}. Payout of ₦{float(vault.worker_payout_amount or 0):,.2f} disbursed to your account.",
                        notification_type='escrow',
                        action_url="/profile?tab=wallet"
                    )
                if vault.client:
                    Notification.objects.create(
                        user=vault.client,
                        title="Milestone Complete & Settled ✓",
                        body=f"Vault {vault.vault_reference} was successfully signed off and settled.",
                        notification_type='escrow',
                        action_url="/profile?tab=wallet"
                    )
            except Exception:
                pass

            return Response({
                'message': 'Escrow successfully disbursed to artisan after 2.5% platform deduction!',
                'settlement': result
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class CancelEscrowView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, vault_reference):
        vault = EscrowVault.objects.filter(Q(vault_reference=vault_reference) | Q(booking_code=vault_reference)).first()
        if not vault:
            return Response({'error': 'Vault not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = CancelEscrowSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        client_nuban = serializer.validated_data.get('client_nuban')

        try:
            result = EscrowSettlementService.process_cancellation_and_refund(vault.id, client_nuban)
            if vault.booking_code:
                Booking.objects.filter(booking_code=vault.booking_code).update(status='cancelled')

            return Response({
                'message': 'Job cancelled. 1% admin fee retained, 99% refunded back to client!',
                'refund': result
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class UserWalletView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        client_vaults = EscrowVault.objects.filter(client=user)
        worker_vaults = EscrowVault.objects.filter(worker=user)

        funds_in_escrow = client_vaults.filter(status__in=['funded', 'partially_released', 'disputed']).aggregate(total=Sum('total_amount'))['total'] or Decimal('0.00')
        funds_refunded = client_vaults.filter(status='cancelled').aggregate(total=Sum('client_refund_amount'))['total'] or Decimal('0.00')
        worker_earned = worker_vaults.filter(status='fully_settled').aggregate(total=Sum('net_worker_amount'))['total'] or Decimal('0.00')

        transactions = EscrowTransaction.objects.filter(Q(vault__client=user) | Q(vault__worker=user)).order_by('-created_at')[:20]

        return Response({
            'funds_in_escrow': funds_in_escrow,
            'funds_refunded': funds_refunded,
            'worker_earned': worker_earned,
            'active_escrows_count': client_vaults.filter(status='funded').count() + worker_vaults.filter(status='funded').count(),
            'transactions': EscrowTransactionSerializer(transactions, many=True).data
        })
