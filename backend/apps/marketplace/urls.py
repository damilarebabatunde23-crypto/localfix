from django.urls import path
from .views import (
    MarketplaceItemListCreateView,
    MarketplaceItemDetailView,
    MarketplaceToggleSaveView,
    MarketplaceSavedListView,
    MarketplaceCategoriesView
)

urlpatterns = [
    path('items/', MarketplaceItemListCreateView.as_view(), name='marketplace_items'),
    path('items/<uuid:id>/', MarketplaceItemDetailView.as_view(), name='marketplace_item_detail'),
    path('items/<uuid:id>/toggle-save/', MarketplaceToggleSaveView.as_view(), name='marketplace_toggle_save'),
    path('saved/', MarketplaceSavedListView.as_view(), name='marketplace_saved_list'),
    path('categories/', MarketplaceCategoriesView.as_view(), name='marketplace_categories'),
]
