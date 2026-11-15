from django.contrib import admin
from .models import DisputeCase, ForensicAudit, MediationMessage

class MediationMessageInline(admin.TabularInline):
    model = MediationMessage
    extra = 0
    readonly_fields = ('sender', 'content', 'attachment_url', 'is_system_event', 'created_at')

class ForensicAuditInline(admin.StackedInline):
    model = ForensicAudit
    extra = 0

@admin.register(DisputeCase)
class DisputeCaseAdmin(admin.ModelAdmin):
    list_display = ('case_number', 'client', 'worker', 'disputed_amount', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('case_number', 'client__email', 'worker__email', 'issue_category')
    inlines = [ForensicAuditInline, MediationMessageInline]

@admin.register(ForensicAudit)
class ForensicAuditAdmin(admin.ModelAdmin):
    list_display = ('dispute', 'auditor_name', 'verdict', 'audit_date')
    list_filter = ('verdict',)

@admin.register(MediationMessage)
class MediationMessageAdmin(admin.ModelAdmin):
    list_display = ('dispute', 'sender', 'is_system_event', 'created_at')
    list_filter = ('is_system_event', 'created_at')
