from django.urls import path
from .views import (
    ConversationListCreateView,
    ConversationDetailView,
    MessageListCreateView,
    MarkConversationReadView
)

urlpatterns = [
    path('conversations/', ConversationListCreateView.as_view(), name='chat_conversations'),
    path('conversations/<uuid:id>/', ConversationDetailView.as_view(), name='chat_conversation_detail'),
    path('conversations/<uuid:id>/messages/', MessageListCreateView.as_view(), name='chat_messages'),
    path('conversations/<uuid:id>/read/', MarkConversationReadView.as_view(), name='chat_mark_read'),
]
