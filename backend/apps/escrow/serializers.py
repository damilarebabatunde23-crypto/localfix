from rest_framework import serializers
from .models import EscrowVault, EscrowTransaction

class EscrowTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = EscrowTransaction
        fields = ['id', 'transaction_type', 'amount', 'recipient_nuban', 'ledger_hash', 'note', 'created_at']

class EscrowVaultSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source='client.full_name', read_only=True)
    worker_name = serializers.CharField(source='worker.full_name', read_only=True)
    transactions = EscrowTransactionSerializer(many=True, read_only=True)

    class Meta:
        model = EscrowVault
        fields = [
            'id', 'vault_reference', 'booking_code', 'client', 'client_name', 'worker', 'worker_name',
            'total_amount', 'platform_fee_percent', 'platform_fee_amount',
            'net_worker_amount', 'cancellation_fee_percent', 'cancellation_fee_amount',
            'client_refund_amount', 'status', 'currency', 'service_description',
            'settlement_nuban', 'client_refund_nuban', 'transactions', 'created_at', 'settled_at'
        ]
        read_only_fields = [
            'id', 'vault_reference', 'platform_fee_amount', 'net_worker_amount',
            'cancellation_fee_amount', 'client_refund_amount', 'created_at', 'settled_at'
        ]

class FundEscrowSerializer(serializers.Serializer):
    worker_id = serializers.CharField(required=True)
    total_amount = serializers.DecimalField(max_digits=14, decimal_places=2, required=True)
    service_description = serializers.CharField(max_length=255, default='Standard Trade Diagnostics & Escrow')
    booking_code = serializers.CharField(max_length=64, required=False, allow_blank=True)
    payment_channel = serializers.CharField(max_length=30, default='bank')
    client_refund_nuban = serializers.CharField(max_length=20, required=False, allow_blank=True)
    settlement_nuban = serializers.CharField(max_length=20, required=False, allow_blank=True)

class ReleaseEscrowSerializer(serializers.Serializer):
    otp = serializers.CharField(max_length=6, required=True)
    settlement_nuban = serializers.CharField(max_length=20, required=False)

class CancelEscrowSerializer(serializers.Serializer):
    reason = serializers.CharField(max_length=255, default='Artisan unavailable / no-show')
    client_nuban = serializers.CharField(max_length=20, required=False)
