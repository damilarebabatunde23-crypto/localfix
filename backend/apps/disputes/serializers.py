from rest_framework import serializers
from .models import DisputeCase, ForensicAudit, MediationMessage

class ForensicAuditSerializer(serializers.ModelSerializer):
    class Meta:
        model = ForensicAudit
        fields = '__all__'

class MediationMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.full_name', read_only=True)
    sender_role = serializers.CharField(source='sender.role', read_only=True)
    sender_avatar = serializers.CharField(source='sender.resolved_avatar', read_only=True)

    class Meta:
        model = MediationMessage
        fields = ['id', 'sender', 'sender_name', 'sender_role', 'sender_avatar', 'content', 'attachment_url', 'is_system_event', 'created_at']

class DisputeCaseSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source='client.full_name', read_only=True)
    worker_name = serializers.CharField(source='worker.full_name', read_only=True)
    arbitrator_name = serializers.CharField(source='arbitrator.full_name', read_only=True, default='Engr. Kehinde Balogun (Lead Arbitrator)')
    forensic_audit = ForensicAuditSerializer(read_only=True)
    messages = MediationMessageSerializer(many=True, read_only=True)

    class Meta:
        model = DisputeCase
        fields = [
            'id', 'case_number', 'booking_code', 'vault_reference', 'booking', 'client', 'client_name',
            'worker', 'worker_name', 'arbitrator', 'arbitrator_name',
            'disputed_amount', 'issue_category', 'description', 'status',
            'resolution_pathway', 'forensic_audit', 'messages', 'created_at', 'updated_at'
        ]
