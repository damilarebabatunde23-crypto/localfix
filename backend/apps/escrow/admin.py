from django.contrib import admin
from .models import EscrowVault, EscrowTransaction

class EscrowTransactionInline(admin.TabularInline):
    model = EscrowTransaction
    extra = 0
    readonly_fields = ('transaction_type', 'amount', 'recipient_nuban', 'ledger_hash', 'created_at')

@admin.register(EscrowVault)
class EscrowVaultAdmin(admin.ModelAdmin):
    list_display = (
        'vault_reference', 'client', 'worker', 'total_amount',
        'platform_fee_amount', 'net_worker_amount', 'status', 'created_at'
    )
    list_filter = ('status', 'created_at', 'currency')
    search_fields = ('vault_reference', 'client__email', 'worker__email', 'settlement_nuban')
    readonly_fields = (
        'vault_reference', 'platform_fee_amount', 'net_worker_amount',
        'cancellation_fee_amount', 'client_refund_amount', 'created_at', 'updated_at'
    )
    inlines = [EscrowTransactionInline]

@admin.register(EscrowTransaction)
class EscrowTransactionAdmin(admin.ModelAdmin):
    list_display = ('vault', 'transaction_type', 'amount', 'recipient_nuban', 'created_at')
    list_filter = ('transaction_type', 'created_at')
    search_fields = ('vault__vault_reference', 'recipient_nuban', 'ledger_hash')
