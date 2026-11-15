from django.contrib import admin
from .models import AssistantSession, AssistantMessage

@admin.register(AssistantSession)
class AssistantSessionAdmin(admin.ModelAdmin):
    list_display = ('title', 'user', 'updated_at', 'created_at')

@admin.register(AssistantMessage)
class AssistantMessageAdmin(admin.ModelAdmin):
    list_display = ('session', 'role', 'content', 'created_at')
    list_filter = ('role',)
