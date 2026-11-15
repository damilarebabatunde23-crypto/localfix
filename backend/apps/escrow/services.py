import hashlib
import time
from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from .models import EscrowVault, EscrowTransaction

def generate_ledger_hash(vault_ref, tx_type, amount):
    payload = f"{vault_ref}:{tx_type}:{amount}:{time.time()}"
    return hashlib.sha256(payload.encode()).hexdigest()

class EscrowSettlementService:
    @staticmethod
    @transaction.atomic
    def process_final_release(vault_id):
        """
        Releases the final balance to worker.
        Deducts the 2.5% platform transaction fee for LocalFix.
        """
        vault = EscrowVault.objects.select_for_update().get(id=vault_id)
        
        if vault.status in ('fully_settled', 'cancelled'):
            raise ValueError(f"Vault {vault.vault_reference} is already closed.")

        # Compute 2.5% platform fee
        fee_amount = vault.platform_fee_amount
        worker_payout = vault.net_worker_amount

        # 1. Record 2.5% platform fee retained by LocalFix
        EscrowTransaction.objects.create(
            vault=vault,
            transaction_type='platform_commission',
            amount=fee_amount,
            ledger_hash=generate_ledger_hash(vault.vault_reference, 'commission', fee_amount),
            note=f"2.5% Platform fee retained by LocalFix on order {vault.vault_reference}"
        )

        # 2. Record net payout sent to worker
        EscrowTransaction.objects.create(
            vault=vault,
            transaction_type='final_payout',
            amount=worker_payout,
            recipient_nuban=vault.settlement_nuban or '0123456789',
            ledger_hash=generate_ledger_hash(vault.vault_reference, 'payout', worker_payout),
            note=f"Net artisan payout (minus 2.5% fee) disbursed upon customer OTP confirmation."
        )

        vault.status = 'fully_settled'
        vault.settled_at = timezone.now()
        vault.save()

        return {
            'vault_reference': vault.vault_reference,
            'total_amount': vault.total_amount,
            'platform_fee_retained': fee_amount,
            'net_worker_payout': worker_payout,
            'status': 'fully_settled'
        }

    @staticmethod
    @transaction.atomic
    def process_cancellation_and_refund(vault_id, client_nuban=None):
        """
        Executes when the artisan fails to attend or service is unavailable.
        Deducts a 1% admin fee and sends the remaining 99% back to client.
        """
        vault = EscrowVault.objects.select_for_update().get(id=vault_id)

        if vault.status in ('fully_settled', 'cancelled'):
            raise ValueError(f"Vault {vault.vault_reference} cannot be cancelled.")

        admin_fee = vault.cancellation_fee_amount
        client_refund = vault.client_refund_amount

        if client_nuban:
            vault.client_refund_nuban = client_nuban

        # 1. Record 1.0% administrative fee
        EscrowTransaction.objects.create(
            vault=vault,
            transaction_type='cancellation_fee',
            amount=admin_fee,
            ledger_hash=generate_ledger_hash(vault.vault_reference, 'cancel_fee', admin_fee),
            note=f"1.0% Administrative cancellation fee retained by LocalFix for {vault.vault_reference}"
        )

        # 2. Record 99.0% immediate refund sent to client
        EscrowTransaction.objects.create(
            vault=vault,
            transaction_type='client_refund',
            amount=client_refund,
            recipient_nuban=vault.client_refund_nuban or 'ProvidusBank/GTBank Virtual NUBAN',
            ledger_hash=generate_ledger_hash(vault.vault_reference, 'refund', client_refund),
            note=f"99.0% Client refund returned to bank account because artisan was unavailable."
        )

        vault.status = 'cancelled'
        vault.settled_at = timezone.now()
        vault.save()

        return {
            'vault_reference': vault.vault_reference,
            'total_amount': vault.total_amount,
            'cancellation_fee_retained': admin_fee,
            'client_refund_sent': client_refund,
            'status': 'cancelled'
        }
