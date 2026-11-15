from django.urls import path
from .views import (
    DisputeCaseListView, DisputeCaseDetailView,
    ForensicAuditDetailView, SendMediationMessageView,
    ExecuteRestitutionView, DisputeRoomView
)

urlpatterns = [
    path('', DisputeCaseListView.as_view(), name='dispute_list'),
    path('<str:case_number>/', DisputeCaseDetailView.as_view(), name='dispute_detail'),
    path('<str:case_number>/room/', DisputeRoomView.as_view(), name='dispute_room'),
    path('<str:case_number>/audit/', ForensicAuditDetailView.as_view(), name='dispute_audit'),
    path('<str:case_number>/messages/', SendMediationMessageView.as_view(), name='dispute_send_message'),
    path('<str:case_number>/restitution/', ExecuteRestitutionView.as_view(), name='dispute_restitution'),
]
