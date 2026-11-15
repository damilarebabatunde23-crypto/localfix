import uuid
from decimal import Decimal
from django.db import models
from django.conf import settings
from apps.services.models import WorkerProfile

class Booking(models.Model):
    STATUS_CHOICES = (
        ('requested', 'Service Requested'),
        ('quoted', 'Artisan Quotation Provided'),
        ('escrow_funded', 'Escrow Funded & Vault Locked'),
        ('in_progress', 'Technician On-Site / Work in Progress'),
        ('completed', 'Work Executed & Signed Off'),
        ('disputed', 'Dispute Flagged & Escrow Frozen'),
        ('cancelled', 'Booking Cancelled'),
    )

    PAYMENT_METHOD_CHOICES = (
        ('escrow', 'LocalFix Escrow Vault (Protected Milestone Lock)'),
        ('direct_settlement', 'Direct In-Person Settlement (Cash / Bank Transfer / Mobile App on Site)'),
    )

    PAYMENT_STATUS_CHOICES = (
        ('unpaid', 'Awaiting Payment'),
        ('escrow_funded', 'Escrow Vault Locked'),
        ('direct_settled', 'In-Person Payment Settled'),
        ('refunded', 'Refunded'),
    )

    ADJUSTMENT_STATUS_CHOICES = (
        ('none', 'No Adjustment'),
        ('pending', 'Pending Client Approval'),
        ('approved', 'Approved by Client'),
        ('declined', 'Declined by Client'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking_code = models.CharField(max_length=32, unique=True, db_index=True)
    
    customer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='customer_bookings')
    worker = models.ForeignKey(WorkerProfile, on_delete=models.CASCADE, related_name='worker_bookings')
    
    service_type = models.CharField(max_length=255)
    description = models.TextField()
    location_address = models.CharField(max_length=255, default='Ikeja GRA, Lagos')
    preferred_date = models.DateTimeField()
    
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='requested')
    payment_method = models.CharField(max_length=30, choices=PAYMENT_METHOD_CHOICES, default='escrow')
    payment_status = models.CharField(max_length=30, choices=PAYMENT_STATUS_CHOICES, default='unpaid')
    
    quoted_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    agreed_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    platform_fee = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    
    # Dynamic On-Site Price Adjustment (Variation Order for Spare Parts / Extra Work)
    price_adjustment_status = models.CharField(max_length=20, choices=ADJUSTMENT_STATUS_CHOICES, default='none')
    price_adjustment_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    price_adjustment_parts_cost = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    price_adjustment_labor_cost = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    price_adjustment_reason = models.TextField(blank=True, default='')
    price_adjustment_proof_url = models.URLField(max_length=500, blank=True, default='')
    price_adjustment_requested_at = models.DateTimeField(null=True, blank=True)
    price_adjustment_responded_at = models.DateTimeField(null=True, blank=True)

    # Real-Life Live GPS Telemetry & Transit Tracking (Uber/InDrive style)
    destination_latitude = models.FloatField(default=6.5916)
    destination_longitude = models.FloatField(default=3.3575)
    worker_current_latitude = models.FloatField(null=True, blank=True)
    worker_current_longitude = models.FloatField(null=True, blank=True)
    transit_status = models.CharField(
        max_length=30,
        choices=(
            ('idle', 'Not Dispatched'),
            ('dispatched', 'Technician Dispatched'),
            ('en_route', 'En Route / Traveling to Job Site'),
            ('arrived', 'Arrived at Destination Doorstep'),
        ),
        default='idle'
    )
    transit_speed_kmh = models.FloatField(default=0.0)
    transit_heading_deg = models.FloatField(default=0.0)
    transit_updated_at = models.DateTimeField(null=True, blank=True)

    # Direct In-Person Physical Settlement Confirmation
    direct_paid_worker_confirmed = models.BooleanField(default=False)
    direct_paid_customer_confirmed = models.BooleanField(default=False)
    direct_settled_at = models.DateTimeField(null=True, blank=True)
    direct_payment_note = models.CharField(max_length=255, blank=True, default='')
    
    currency = models.CharField(max_length=10, default='USD')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.booking_code:
            self.booking_code = f"LX-{uuid.uuid4().hex[:6].upper()}"
        if self.agreed_amount and not self.platform_fee:
            self.platform_fee = (self.agreed_amount * Decimal('0.025')).quantize(Decimal('0.01'))
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.booking_code} — {self.service_type} ({self.get_status_display()})"

class BookingEvent(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='events')
    event_type = models.CharField(max_length=100)
    description = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.booking.booking_code} — {self.event_type}"
