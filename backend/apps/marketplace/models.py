import uuid
from decimal import Decimal
from django.db import models
from django.conf import settings

class MarketplaceItem(models.Model):
    CONDITION_CHOICES = (
        ('brand_new', 'Brand New in Box'),
        ('like_new', 'Like New'),
        ('fair', 'Fair (Tested Operational)'),
        ('used', 'Used'),
    )

    STATUS_CHOICES = (
        ('available', 'Available'),
        ('reserved', 'Reserved'),
        ('sold', 'Sold'),
        ('removed', 'Removed'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    seller = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='marketplace_listings')
    
    title = models.CharField(max_length=255)
    description = models.TextField()
    category = models.CharField(max_length=100)
    condition = models.CharField(max_length=20, choices=CONDITION_CHOICES, default='like_new')
    
    price = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    currency = models.CharField(max_length=10, default='NGN')
    
    images = models.JSONField(default=list, blank=True)
    location_name = models.CharField(max_length=255, default='Ikeja GRA, Lagos')
    latitude = models.FloatField(default=6.60)
    longitude = models.FloatField(default=3.35)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='available')
    is_inspection_ready = models.BooleanField(default=True)
    pickup_options = models.JSONField(default=list, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} — ₦{self.price:,.2f} ({self.seller.full_name})"

class MarketplaceSavedItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='saved_marketplace_items')
    item = models.ForeignKey(MarketplaceItem, on_delete=models.CASCADE, related_name='saved_by_users')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'item')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.email} saved {self.item.title}"
