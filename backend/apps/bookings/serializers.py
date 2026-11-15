from rest_framework import serializers
from .models import Booking, BookingEvent
from apps.services.serializers import WorkerProfileSerializer

class BookingEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = BookingEvent
        fields = ['id', 'event_type', 'description', 'created_at']

class BookingSerializer(serializers.ModelSerializer):
    worker_details = WorkerProfileSerializer(source='worker', read_only=True)
    customer_name = serializers.CharField(source='customer.full_name', read_only=True)
    events = BookingEventSerializer(many=True, read_only=True)

    class Meta:
        model = Booking
        fields = [
            'id', 'booking_code', 'customer', 'customer_name', 'worker',
            'worker_details', 'service_type', 'description', 'location_address',
            'preferred_date', 'status', 'payment_method', 'payment_status',
            'quoted_amount', 'agreed_amount', 'platform_fee', 'currency',
            'price_adjustment_status', 'price_adjustment_amount',
            'price_adjustment_parts_cost', 'price_adjustment_labor_cost',
            'price_adjustment_reason', 'price_adjustment_proof_url',
            'price_adjustment_requested_at', 'price_adjustment_responded_at',
            'destination_latitude', 'destination_longitude',
            'worker_current_latitude', 'worker_current_longitude',
            'transit_status', 'transit_speed_kmh', 'transit_heading_deg',
            'transit_updated_at',
            'direct_paid_worker_confirmed', 'direct_paid_customer_confirmed',
            'direct_settled_at', 'direct_payment_note',
            'events', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'booking_code', 'customer', 'platform_fee', 'created_at', 'updated_at']
