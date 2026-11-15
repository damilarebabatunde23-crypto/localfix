from django.urls import path
from .views import (
    VideoPostListCreateView,
    VideoPostDetailView,
    VideoToggleLikeView,
    VideoToggleSaveView,
    VideoCommentListCreateView,
    CommentToggleLikeView
)

urlpatterns = [
    path('videos/', VideoPostListCreateView.as_view(), name='feed_videos'),
    path('videos/<str:id>/', VideoPostDetailView.as_view(), name='feed_video_detail'),
    path('videos/<str:id>/like/', VideoToggleLikeView.as_view(), name='feed_video_like'),
    path('videos/<str:id>/save/', VideoToggleSaveView.as_view(), name='feed_video_save'),
    path('videos/<str:id>/comments/', VideoCommentListCreateView.as_view(), name='feed_video_comments'),
    path('comments/<str:id>/like/', CommentToggleLikeView.as_view(), name='feed_comment_like'),
]
