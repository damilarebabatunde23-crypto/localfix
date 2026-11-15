from django.urls import path
from .views import (
    EscrowVaultListView, EscrowVaultDetailView,
    ReleaseEscrowView, CancelEscrowView, FundEscrowView, UserWalletView
)

urlpatterns = [
    path('vaults/', EscrowVaultListView.as_view(), name='escrow_vault_list'),
    path('vaults/fund/', FundEscrowView.as_view(), name='escrow_fund'),
    path('vaults/<str:vault_reference>/', EscrowVaultDetailView.as_view(), name='escrow_vault_detail'),
    path('vaults/<str:vault_reference>/release/', ReleaseEscrowView.as_view(), name='escrow_release_payout'),
    path('vaults/<str:vault_reference>/cancel/', CancelEscrowView.as_view(), name='escrow_cancel_refund'),
    path('wallet/', UserWalletView.as_view(), name='escrow_user_wallet'),
]
