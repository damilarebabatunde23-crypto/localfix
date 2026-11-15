from django.contrib import admin
from .models import Conversation, ChatMessage

@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ('id', 'updated_at', 'created_at')

@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ('sender', 'conversation', 'content', 'message_type', 'is_read', 'created_at')
    list_filter = ('message_type', 'is_read')
