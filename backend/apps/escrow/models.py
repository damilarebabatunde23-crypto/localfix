import uuid
from decimal import Decimal
from django.db import models
from django.conf import settings

class EscrowVault(models.Model):
    STATUS_CHOICES = (
        ('pending_deposit', 'Awaiting Client Deposit'),
        ('funded', 'Funded & Held in Custody'),
        ('partially_released', 'Milestone 1 Released (40%)'),
        ('fully_settled', 'Fully Settled (100% Disbursed)'),
        ('disputed', 'Frozen Under Dispute Review'),
        ('cancelled', 'Cancelled & Refunded (99%)'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vault_reference = models.CharField(max_length=64, unique=True, db_index=True)
    booking_code = models.CharField(max_length=64, blank=True, null=True, db_index=True)
    
    client = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='client_escrows')
    worker = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='worker_escrows')
    
    # Financial breakdown
    total_amount = models.DecimalField(max_digits=14, decimal_places=2, help_text="Total escrow deposited by client (NGN)")
    platform_fee_percent = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('2.50'), help_text="Company cut: 2.5%")
    platform_fee_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    
    net_worker_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'), help_text="Worker payout after 2.5% company fee")
    
    # Cancellation & Refund breakdown
    cancellation_fee_percent = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('1.00'), help_text="1% fee if cancelled")
    cancellation_fee_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    client_refund_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'), help_text="99% refund sent to client")
    
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='funded')
    currency = models.CharField(max_length=10, default='NGN')
    
    service_description = models.CharField(max_length=255, default='Inverter Relay & Diagnostic Overhaul')
    settlement_nuban = models.CharField(max_length=20, blank=True, null=True, help_text="Worker NUBAN account number")
    client_refund_nuban = models.CharField(max_length=20, blank=True, null=True, help_text="Client bank account for refunds")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    settled_at = models.DateTimeField(blank=True, null=True)

    def save(self, *args, **kwargs):
        # Auto-compute standard 2.5% platform fee and worker net payout
        if self.total_amount:
            self.platform_fee_amount = (self.total_amount * (self.platform_fee_percent / Decimal('100.0'))).quantize(Decimal('0.01'))
            self.net_worker_amount = (self.total_amount - self.platform_fee_amount).quantize(Decimal('0.01'))
            
            # Compute potential 1% cancellation fee & 99% client refund
            self.cancellation_fee_amount = (self.total_amount * (self.cancellation_fee_percent / Decimal('100.0'))).quantize(Decimal('0.01'))
            self.client_refund_amount = (self.total_amount - self.cancellation_fee_amount).quantize(Decimal('0.01'))
            
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.vault_reference} — ₦{self.total_amount:,.2f} ({self.get_status_display()})"

class EscrowTransaction(models.Model):
    TYPE_CHOICES = (
        ('client_deposit', 'Client Deposit into Escrow'),
        ('mobilization_payout', 'Mobilization Payout (40%) to Worker'),
        ('final_payout', 'Final Net Payout (60% minus 2.5% fee) to Worker'),
        ('platform_commission', 'Platform Commission (2.5%) Retained by LocalFix'),
        ('cancellation_fee', 'Cancellation Admin Fee (1.0%) Retained by LocalFix'),
        ('client_refund', 'Client Refund (99.0%) Returned to Client'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vault = models.ForeignKey(EscrowVault, on_delete=models.CASCADE, related_name='transactions')
    transaction_type = models.CharField(max_length=30, choices=TYPE_CHOICES)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    recipient_nuban = models.CharField(max_length=20, blank=True, null=True)
    ledger_hash = models.CharField(max_length=128, blank=True, null=True, help_text="SHA-256 cryptographic proof")
    note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.transaction_type}: ₦{self.amount:,.2f} ({self.vault.vault_reference})"
