from django.urls import path
from .views import (
    ConversationListCreateView,
    ConversationDetailView,
    MessageListCreateView,
    MarkConversationReadView,
    StartCallView,
    GetActiveCallView,
    CallDetailView,
    AnswerCallView,
    SendIceCandidateView,
    EndCallView,
)

urlpatterns = [
    path('conversations/', ConversationListCreateView.as_view(), name='chat_conversations'),
    path('conversations/<uuid:id>/', ConversationDetailView.as_view(), name='chat_conversation_detail'),
    path('conversations/<uuid:id>/messages/', MessageListCreateView.as_view(), name='chat_messages'),
    path('conversations/<uuid:id>/read/', MarkConversationReadView.as_view(), name='chat_mark_read'),

    # Real WebRTC Live Call Signaling
    path('calls/start/', StartCallView.as_view(), name='call_start'),
    path('calls/active/', GetActiveCallView.as_view(), name='call_active'),
    path('calls/<uuid:id>/', CallDetailView.as_view(), name='call_detail'),
    path('calls/<uuid:id>/answer/', AnswerCallView.as_view(), name='call_answer'),
    path('calls/<uuid:id>/ice-candidate/', SendIceCandidateView.as_view(), name='call_ice_candidate'),
    path('calls/<uuid:id>/end/', EndCallView.as_view(), name='call_end'),
]
