from django.urls import path
from .views import AssistantChatView, AssistantPromptsView

urlpatterns = [
    path('chat/', AssistantChatView.as_view(), name='assistant_chat'),
    path('prompts/', AssistantPromptsView.as_view(), name='assistant_prompts'),
]
