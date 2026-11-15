from rest_framework import serializers
from .models import MarketplaceItem, MarketplaceSavedItem

class MarketplaceItemSerializer(serializers.ModelSerializer):
    seller_name = serializers.CharField(source='seller.full_name', read_only=True)
    seller_avatar = serializers.CharField(source='seller.resolved_avatar', read_only=True)
    seller_is_verified = serializers.BooleanField(source='seller.is_verified', read_only=True)
    seller_badge = serializers.SerializerMethodField()
    is_saved = serializers.SerializerMethodField()

    class Meta:
        model = MarketplaceItem
        fields = [
            'id', 'seller', 'seller_name', 'seller_avatar', 'seller_is_verified',
            'seller_badge', 'title', 'description', 'category', 'condition',
            'price', 'currency', 'images', 'location_name', 'latitude',
            'longitude', 'status', 'is_inspection_ready', 'pickup_options',
            'is_saved', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'seller', 'created_at', 'updated_at']

    def get_seller_badge(self, obj):
        if hasattr(obj.seller, 'worker_profile'):
            return obj.seller.worker_profile.verification_badge or 'Verified Artisan'
        return 'Verified Resident' if obj.seller.is_verified else 'Member'

    def get_is_saved(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return MarketplaceSavedItem.objects.filter(user=request.user, item=obj).exists()
        return False
