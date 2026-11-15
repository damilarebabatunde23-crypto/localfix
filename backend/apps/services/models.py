import uuid
from django.db import models
from django.conf import settings

class ServiceCategory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=100, unique=True)
    icon = models.CharField(max_length=20, default='⚡')
    color = models.CharField(max_length=20, default='#6D28D9')
    description = models.TextField(blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name_plural = 'Service Categories'
        ordering = ['order', 'name']

    def __str__(self):
        return f"{self.icon} {self.name}"

class WorkerProfile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='worker_profile')
    
    profession = models.CharField(max_length=255)
    category = models.ForeignKey(ServiceCategory, on_delete=models.SET_NULL, null=True, related_name='workers')
    bio = models.TextField()
    years_experience = models.PositiveIntegerField(default=5)
    
    service_area = models.CharField(max_length=255, default='Ikeja GRA & Lekki Phase 1')
    service_radius_km = models.PositiveIntegerField(default=15)
    
    latitude = models.FloatField(default=6.6018)
    longitude = models.FloatField(default=3.3515)
    
    callout_rate = models.DecimalField(max_digits=12, decimal_places=2, default=12000.00)
    currency = models.CharField(max_length=10, default='USD')
    
    country = models.CharField(max_length=100, default='Global')
    city = models.CharField(max_length=100, default='Global')
    phone_number = models.CharField(max_length=50, blank=True, default='')
    whatsapp_number = models.CharField(max_length=50, blank=True, default='')
    
    payout_method = models.CharField(max_length=50, default='bank_transfer', help_text="bank_transfer, iban_swift, paypal, stripe, mobile_money, cash")
    payout_details = models.CharField(max_length=255, blank=True, default='', help_text="IBAN, SWIFT, Account Number, PayPal email, or Cash")
    
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)
    review_count = models.PositiveIntegerField(default=0)
    completed_jobs = models.PositiveIntegerField(default=0)
    
    is_verified = models.BooleanField(default=True)
    verification_badge = models.CharField(max_length=50, default='Vetted Pro')
    is_online = models.BooleanField(default=True)
    avg_response_mins = models.PositiveIntegerField(default=12)
    
    specialisms = models.JSONField(default=list, blank=True)
    is_available = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-rating', '-created_at']

    def __str__(self):
        return f"{self.user.full_name} — {self.profession}"

class PortfolioItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    worker = models.ForeignKey(WorkerProfile, on_delete=models.CASCADE, related_name='portfolio_items')
    title = models.CharField(max_length=255)
    category = models.CharField(max_length=100)
    location = models.CharField(max_length=255, default='Lagos, Nigeria')
    image_url = models.URLField(max_length=500)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} ({self.worker.user.full_name})"

class Review(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    worker = models.ForeignKey(WorkerProfile, on_delete=models.CASCADE, related_name='reviews')
    client = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='given_reviews')
    rating = models.PositiveSmallIntegerField(default=5)
    job_title = models.CharField(max_length=255, blank=True)
    comment = models.TextField()
    location = models.CharField(max_length=255, default='Ikeja GRA, Lagos')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.rating}★ by {self.client.full_name} for {self.worker.user.full_name}"
