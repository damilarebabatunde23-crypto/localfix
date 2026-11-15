from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import (
    RegisterView, ProfileView, PublicUserProfileView,
    NotificationListView, MarkNotificationReadView, MarkAllNotificationsReadView,
    GoogleAuthView, ContactInquiryView
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='auth_register'),
    path('login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('google/', GoogleAuthView.as_view(), name='auth_google'),
    path('contact/', ContactInquiryView.as_view(), name='auth_contact'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('profile/', ProfileView.as_view(), name='auth_profile'),
    path('users/<uuid:id>/', PublicUserProfileView.as_view(), name='public_user_profile'),
    path('notifications/', NotificationListView.as_view(), name='notifications_list'),
    path('notifications/<uuid:pk>/read/', MarkNotificationReadView.as_view(), name='notification_mark_read'),
    path('notifications/read-all/', MarkAllNotificationsReadView.as_view(), name='notifications_mark_all_read'),
]
