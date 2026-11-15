from django.contrib import admin
from .models import MarketplaceItem, MarketplaceSavedItem

@admin.register(MarketplaceItem)
class MarketplaceItemAdmin(admin.ModelAdmin):
    list_display = ('title', 'category', 'condition', 'price', 'seller', 'status', 'created_at')
    list_filter = ('category', 'condition', 'status')
    search_fields = ('title', 'description', 'seller__first_name', 'seller__last_name', 'seller__email')

@admin.register(MarketplaceSavedItem)
class MarketplaceSavedItemAdmin(admin.ModelAdmin):
    list_display = ('user', 'item', 'created_at')
