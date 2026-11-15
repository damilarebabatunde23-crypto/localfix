from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.db.models import Q
from .models import DisputeCase, ForensicAudit, MediationMessage
from .serializers import DisputeCaseSerializer, ForensicAuditSerializer, MediationMessageSerializer
from apps.escrow.models import EscrowVault, EscrowTransaction
from apps.escrow.services import generate_ledger_hash

def get_dispute_by_ref(ref):
    return DisputeCase.objects.filter(
        Q(case_number=ref) | Q(booking_code=ref) | Q(vault_reference=ref)
    ).prefetch_related('messages', 'forensic_audit').first()

class DisputeCaseListView(generics.ListCreateAPIView):
    serializer_class = DisputeCaseSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return DisputeCase.objects.filter(Q(client=user) | Q(worker=user) | Q(arbitrator=user)).distinct()

    def perform_create(self, serializer):
        serializer.save(client=self.request.user)

class DisputeCaseDetailView(generics.RetrieveAPIView):
    serializer_class = DisputeCaseSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        ref = self.kwargs.get('case_number')
        dispute = get_dispute_by_ref(ref)
        if not dispute:
            return get_object_or_404(DisputeCase, case_number=ref)
        return dispute

class ForensicAuditDetailView(generics.RetrieveAPIView):
    serializer_class = ForensicAuditSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        ref = self.kwargs.get('case_number')
        dispute = get_dispute_by_ref(ref)
        if not dispute:
            dispute = get_object_or_404(DisputeCase, case_number=ref)
        return get_object_or_404(ForensicAudit, dispute=dispute)

class SendMediationMessageView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, case_number):
        dispute = get_dispute_by_ref(case_number)
        if not dispute:
            dispute = get_object_or_404(DisputeCase, case_number=case_number)

        content = request.data.get('content')
        attachment_url = request.data.get('attachment_url')

        if not content:
            return Response({'error': 'Message content cannot be empty.'}, status=status.HTTP_400_BAD_REQUEST)

        msg = MediationMessage.objects.create(
            dispute=dispute,
            sender=request.user,
            content=content,
            attachment_url=attachment_url
        )
        return Response(MediationMessageSerializer(msg).data, status=status.HTTP_201_CREATED)

class ExecuteRestitutionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, case_number):
        dispute = get_dispute_by_ref(case_number)
        if not dispute:
            dispute = get_object_or_404(DisputeCase, case_number=case_number)

        # Mark dispute status
        dispute.status = 'restitution_executed'
        dispute.save()

        # Find linked vault and execute restitution
        vault = None
        if dispute.vault_reference:
            vault = EscrowVault.objects.filter(vault_reference=dispute.vault_reference).first()
        elif dispute.booking_code:
            vault = EscrowVault.objects.filter(booking_code=dispute.booking_code).first()

        restitution_amount = dispute.disputed_amount
        ledger_proof = None
        if vault:
            vault.status = 'cancelled'
            vault.client_refund_amount = restitution_amount
            vault.save()

            ledger_proof = generate_ledger_hash(vault.vault_reference, 'restitution', restitution_amount)
            EscrowTransaction.objects.create(
                vault=vault,
                transaction_type='client_refund',
                amount=restitution_amount,
                recipient_nuban=vault.client_refund_nuban or 'Providus Escrow Virtual Wallet',
                ledger_hash=ledger_proof,
                note=f"100% Client Escrow Restitution executed pursuant to Binding Arbitral Ruling for {dispute.case_number}."
            )

        # Create system mediation audit entry
        MediationMessage.objects.create(
            dispute=dispute,
            sender=request.user,
            content=f"RESTITUTION ACCEPTED: ₦{restitution_amount:,.2f} transferred into Homeowner Escrow Wallet. Arbitral Case closed.",
            is_system_event=True
        )

        return Response({
            'message': f'Restitution accepted! ₦{restitution_amount:,.2f} successfully credited to Homeowner Wallet.',
            'case_number': dispute.case_number,
            'status': 'restitution_executed',
            'amount': restitution_amount,
            'ledger_hash': ledger_proof or generate_ledger_hash(dispute.case_number, 'restitution', restitution_amount)
        }, status=status.HTTP_200_OK)

class DisputeRoomView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, case_number):
        dispute = get_dispute_by_ref(case_number)
        if not dispute:
            dispute = get_object_or_404(DisputeCase, case_number=case_number)

        serializer = DisputeCaseSerializer(dispute)
        data = serializer.data
        data['session_metadata'] = {
            'room_code': 'ESCROW MEDIATION ROOM #04',
            'escrow_frozen': float(dispute.disputed_amount),
            'currency': 'NGN',
            'guarantee': 'Standard 48-Hour Technical Dispute Guarantee',
            'presiding_body': 'Ikeja Central Electrical & Solar Board',
            'lead_arbitrator': 'Amina Bello (Lagos Sector #04)',
            'cbe_trust_vault': 'Providus Bank Escrow Custody',
            'active_time_elapsed_secs': 1480,
        }
        return Response(data)
