import uuid
from django.db import models
from django.conf import settings

class Conversation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    participants = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='conversations')
    booking = models.ForeignKey('bookings.Booking', on_delete=models.SET_NULL, null=True, blank=True, related_name='conversations')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        user_names = ", ".join([u.full_name for u in self.participants.all()[:2]])
        return f"Chat: {user_names}"

class ChatMessage(models.Model):
    TYPE_CHOICES = (
        ('text', 'Text Message'),
        ('image', 'Photo / Work Attachment'),
        ('document', 'PDF / Diagnostic Spec'),
        ('voice', 'Voice Note'),
        ('system', 'System Audit Event'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sent_chat_messages')
    
    content = models.TextField()
    message_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='text')
    media_url = models.URLField(max_length=500, blank=True, null=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"[{self.sender.first_name}] {self.content[:30]}"

class CallSession(models.Model):
    STATUS_CHOICES = (
        ('ringing', 'Ringing'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
        ('ended', 'Ended'),
    )
    TYPE_CHOICES = (
        ('audio', 'Voice Call'),
        ('video', 'Video Call'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    caller = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='initiated_calls')
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='received_calls')
    conversation = models.ForeignKey(Conversation, on_delete=models.SET_NULL, null=True, blank=True, related_name='call_sessions')
    call_type = models.CharField(max_length=10, choices=TYPE_CHOICES, default='audio')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ringing')
    
    # WebRTC Signaling Data
    offer = models.JSONField(null=True, blank=True)
    answer = models.JSONField(null=True, blank=True)
    caller_candidates = models.JSONField(default=list, blank=True)
    recipient_candidates = models.JSONField(default=list, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.call_type} call from {self.caller} to {self.recipient} [{self.status}]"

