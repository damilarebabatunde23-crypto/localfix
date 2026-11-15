from django.contrib import admin
from .models import Booking, BookingEvent

class BookingEventInline(admin.TabularInline):
    model = BookingEvent
    extra = 1

@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ('booking_code', 'customer', 'worker', 'service_type', 'agreed_amount', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('booking_code', 'customer__email', 'worker__user__email', 'service_type')
    inlines = [BookingEventInline]
