from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Notification, ContactInquiry

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    model = User
    list_display = ('email', 'first_name', 'last_name', 'role', 'location_name', 'is_verified', 'is_staff')
    list_filter = ('role', 'is_verified', 'nin_verified', 'is_staff', 'is_active')
    search_fields = ('email', 'first_name', 'last_name', 'phone', 'location_name')
    ordering = ('-created_at',)
    
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal Info', {'fields': ('first_name', 'last_name', 'phone', 'avatar', 'avatar_url', 'bio', 'location_name', 'tier')}),
        ('Verification & Compliance', {'fields': ('role', 'is_verified', 'nin_verified', 'nin_number')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('title', 'user', 'notification_type', 'is_read', 'created_at')
    list_filter = ('notification_type', 'is_read', 'created_at')
    search_fields = ('title', 'body', 'user__email', 'user__first_name', 'user__last_name')

@admin.register(ContactInquiry)
class ContactInquiryAdmin(admin.ModelAdmin):
    list_display = ('ticket_number', 'name', 'email', 'department', 'subject', 'status', 'created_at')
    list_filter = ('department', 'status', 'created_at')
    search_fields = ('ticket_number', 'name', 'email', 'subject', 'message')
    readonly_fields = ('ticket_number', 'created_at')
