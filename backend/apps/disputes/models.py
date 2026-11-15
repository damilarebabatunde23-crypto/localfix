import uuid
from decimal import Decimal
from django.db import models
from django.conf import settings
from apps.bookings.models import Booking

class DisputeCase(models.Model):
    STATUS_CHOICES = (
        ('opened', 'Dispute Opened & Escrow Frozen'),
        ('in_mediation', 'Live 3-Way Mediation in Progress'),
        ('audit_pending', 'Forensic Technical Inspection Scheduled'),
        ('ruling_delivered', 'Binding Arbitral Ruling Delivered'),
        ('restitution_executed', 'Restitution & Escrow Settled'),
        ('closed', 'Case Closed'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case_number = models.CharField(max_length=32, unique=True, default='DSP-84920')
    booking_code = models.CharField(max_length=64, blank=True, null=True, db_index=True)
    vault_reference = models.CharField(max_length=64, blank=True, null=True, db_index=True)
    
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='disputes', null=True, blank=True)
    client = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='client_disputes')
    worker = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='worker_disputes')
    arbitrator = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='arbitrated_disputes')
    
    disputed_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('45000.00'))
    issue_category = models.CharField(max_length=100, default='Faulty Relay & Non-Functional Output Post-Install')
    description = models.TextField()
    
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='in_mediation')
    resolution_pathway = models.CharField(max_length=50, blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"#{self.case_number} — ₦{self.disputed_amount:,.2f} ({self.get_status_display()})"

class ForensicAudit(models.Model):
    VERDICT_CHOICES = (
        ('fault_confirmed', 'FAULT CONFIRMED (Workmanship Failure)'),
        ('fault_dismissed', 'FAULT DISMISSED (Client Component Wear)'),
        ('split_liability', 'SPLIT LIABILITY (50/50 Shared Fault)'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    dispute = models.OneToOneField(DisputeCase, on_delete=models.CASCADE, related_name='forensic_audit')
    
    auditor_name = models.CharField(max_length=150, default='Engr. Kehinde Balogun')
    coren_registration = models.CharField(max_length=50, default='MNSE, COREN Reg: 44,192')
    
    verdict = models.CharField(max_length=30, choices=VERDICT_CHOICES, default='fault_confirmed')
    
    # Bench Test Parameters
    insulation_resistance = models.CharField(max_length=100, default='0.12 MΩ (FAILED - Below 1.0 MΩ standard)')
    dielectric_breakdown = models.CharField(max_length=100, default='Hipot 1.5kV - 4.2mA Leakage (FAILED)')
    harmonic_distortion = models.CharField(max_length=100, default='THD 8.4% (BORDERLINE)')
    loop_impedance = models.CharField(max_length=100, default='0.42 Ω (PASSED)')
    
    instrumentation = models.CharField(max_length=255, default='Megger MIT410, Fluke 435-II, FLIR E8-XT')
    enforceable_remedy = models.TextField(default='100% Client Escrow Restitution (₦45,000.00) plus Guild Disciplinary Demerit.')
    audit_date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Audit for {self.dispute.case_number} — {self.get_verdict_display()}"

class MediationMessage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    dispute = models.ForeignKey(DisputeCase, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    
    content = models.TextField()
    attachment_url = models.URLField(max_length=500, blank=True, null=True)
    is_system_event = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"[{self.dispute.case_number}] {self.sender.first_name}: {self.content[:30]}"
