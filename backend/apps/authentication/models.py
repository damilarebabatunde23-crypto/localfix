import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager

class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'admin')
        return self.create_user(email, password, **extra_fields)

class User(AbstractUser):
    ROLE_CHOICES = (
        ('customer', 'Customer / Resident'),
        ('worker', 'Artisan / Tradesman'),
        ('arbitrator', 'Dispute Arbitrator'),
        ('admin', 'Platform Administrator'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    username = models.CharField(max_length=150, unique=False, blank=True, null=True)
    email = models.EmailField('Email Address', unique=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='customer')
    
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    avatar_url = models.URLField(max_length=500, blank=True, null=True)
    
    location_name = models.CharField(max_length=255, default='Ikeja GRA, Lagos')
    latitude = models.FloatField(default=6.5916)
    longitude = models.FloatField(default=3.3575)
    
    # Verification & Security Badges
    is_verified = models.BooleanField(default=False)
    is_email_verified = models.BooleanField(default=False)
    nin_verified = models.BooleanField(default=False)
    nin_number = models.CharField(max_length=15, blank=True, null=True)
    
    # Tier / Resident Profile
    tier = models.CharField(max_length=50, default='Tier 3 Gold Resident')
    bio = models.TextField(blank=True, null=True)
    languages = models.JSONField(default=list, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    objects = UserManager()

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.email})"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip()

    @property
    def resolved_avatar(self):
        if self.avatar:
            return self.avatar.url
        if self.avatar_url:
            return self.avatar_url
        return f"https://api.dicebear.com/7.x/avataaars/svg?seed={self.first_name}&backgroundColor=6D28D9"

class Notification(models.Model):
    NOTIFICATION_TYPES = (
        ('system', 'System'),
        ('escrow', 'Escrow & Payments'),
        ('job', 'Job & Booking'),
        ('security', 'Security & Verification'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=255)
    body = models.TextField()
    notification_type = models.CharField(max_length=50, choices=NOTIFICATION_TYPES, default='system')
    is_read = models.BooleanField(default=False)
    action_url = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.email} - {self.title}"


class ContactInquiry(models.Model):
    DEPARTMENT_CHOICES = (
        ('general', 'General Support & Inquiries'),
        ('escrow', 'Escrow & Fund Release Conciliation'),
        ('dispute', 'Dispute Escalation & Forensic Arbitration'),
        ('artisan', 'Artisan Onboarding & NIN Verification'),
        ('partnership', 'Enterprise & Estate Partnerships'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ticket_number = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=150)
    email = models.EmailField()
    phone = models.CharField(max_length=30, blank=True, null=True)
    department = models.CharField(max_length=50, choices=DEPARTMENT_CHOICES, default='general')
    subject = models.CharField(max_length=255)
    message = models.TextField()
    attachment_url = models.URLField(max_length=500, blank=True, null=True)
    status = models.CharField(max_length=30, default='open')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.ticket_number}] {self.subject} ({self.name})"
