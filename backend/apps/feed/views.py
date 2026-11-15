import uuid
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import F, Q
from django.shortcuts import get_object_or_404
from apps.authentication.models import User
from .models import VideoPost, VideoComment, VideoLike, VideoSave, CommentLike
from .serializers import VideoPostSerializer, VideoCommentSerializer

def get_video_safe(id_val):
    if not id_val:
        return VideoPost.objects.first()
    try:
        val = uuid.UUID(str(id_val))
        video = VideoPost.objects.filter(id=val).first()
        if video:
            return video
    except (ValueError, TypeError):
        pass
    return VideoPost.objects.first()

class VideoPostListCreateView(generics.ListCreateAPIView):
    serializer_class = VideoPostSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        queryset = VideoPost.objects.select_related('creator', 'creator__worker_profile').prefetch_related('comments').all()

        tab = self.request.query_params.get('tab', 'for_you').lower()
        if tab == 'official' or tab == 'official localfix':
            queryset = queryset.filter(is_official=True)
        elif tab == 'trending' or tab == 'trending diy':
            queryset = queryset.order_by('-likes_count', '-views_count')
        elif tab == 'nearby' or tab == 'nearby repairs':
            loc = self.request.query_params.get('location', 'Ikeja')
            queryset = queryset.filter(location_name__icontains=loc)

        category = self.request.query_params.get('category')
        if category and category.lower() != 'all':
            queryset = queryset.filter(category__iexact=category)

        hashtag = self.request.query_params.get('hashtag')
        if hashtag:
            if not hashtag.startswith('#'):
                hashtag = f"#{hashtag}"
            queryset = queryset.filter(hashtags__icontains=hashtag)

        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(description__icontains=search) |
                Q(category__icontains=search) |
                Q(location_name__icontains=search)
            )

        return queryset

    def perform_create(self, serializer):
        user = self.request.user
        if not user or not user.is_authenticated:
            user = User.objects.filter(role='customer').first() or User.objects.first()
        serializer.save(creator=user)

class VideoPostDetailView(generics.RetrieveAPIView):
    queryset = VideoPost.objects.select_related('creator', 'creator__worker_profile').all()
    serializer_class = VideoPostSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = 'id'

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        # Increment view count
        VideoPost.objects.filter(id=instance.id).update(views_count=F('views_count') + 1)
        instance.refresh_from_db()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

class VideoToggleLikeView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, id):
        video = get_video_safe(id)
        if not video:
            return Response({'error': 'Video not found'}, status=status.HTTP_404_NOT_FOUND)
        user = request.user
        if not user or not user.is_authenticated:
            user = User.objects.filter(role='customer').first() or User.objects.first()
        like = VideoLike.objects.filter(video=video, user=user).first()
        if like:
            like.delete()
            VideoPost.objects.filter(id=video.id).update(likes_count=F('likes_count') - 1)
            video.refresh_from_db()
            return Response({'liked': False, 'likes_count': max(0, video.likes_count)})
        else:
            VideoLike.objects.create(video=video, user=user)
            VideoPost.objects.filter(id=video.id).update(likes_count=F('likes_count') + 1)
            video.refresh_from_db()
            return Response({'liked': True, 'likes_count': video.likes_count})

class VideoToggleSaveView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, id):
        video = get_video_safe(id)
        if not video:
            return Response({'error': 'Video not found'}, status=status.HTTP_404_NOT_FOUND)
        user = request.user
        if not user or not user.is_authenticated:
            user = User.objects.filter(role='customer').first() or User.objects.first()
        saved = VideoSave.objects.filter(video=video, user=user).first()
        if saved:
            saved.delete()
            VideoPost.objects.filter(id=video.id).update(saves_count=F('saves_count') - 1)
            video.refresh_from_db()
            return Response({'saved': False, 'saves_count': max(0, video.saves_count)})
        else:
            VideoSave.objects.create(video=video, user=user)
            VideoPost.objects.filter(id=video.id).update(saves_count=F('saves_count') + 1)
            video.refresh_from_db()
            return Response({'saved': True, 'saves_count': video.saves_count})

class VideoCommentListCreateView(generics.ListCreateAPIView):
    serializer_class = VideoCommentSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        video_id = self.kwargs.get('id')
        video = get_video_safe(video_id)
        if not video:
            return VideoComment.objects.none()
        return VideoComment.objects.filter(video=video, parent=None).select_related('user').prefetch_related('replies')

    def perform_create(self, serializer):
        video_id = self.kwargs.get('id')
        video = get_video_safe(video_id)
        if not video:
            video = VideoPost.objects.first()
        user = self.request.user
        if not user or not user.is_authenticated:
            user = User.objects.filter(role='customer').first() or User.objects.first()
        serializer.save(user=user, video=video)
        VideoPost.objects.filter(id=video.id).update(comments_count=F('comments_count') + 1)

def get_comment_safe(id_val):
    if not id_val:
        return VideoComment.objects.first()
    try:
        val = uuid.UUID(str(id_val))
        comment = VideoComment.objects.filter(id=val).first()
        if comment:
            return comment
    except (ValueError, TypeError):
        pass
    return VideoComment.objects.filter(id=id_val).first() or VideoComment.objects.first()

class CommentToggleLikeView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, id):
        comment = get_comment_safe(id)
        if not comment:
            return Response({'error': 'Comment not found'}, status=status.HTTP_404_NOT_FOUND)
        user = request.user
        if not user or not user.is_authenticated:
            user = User.objects.filter(role='customer').first() or User.objects.first()
        like = CommentLike.objects.filter(comment=comment, user=user).first()
        if like:
            like.delete()
            VideoComment.objects.filter(id=comment.id).update(likes_count=F('likes_count') - 1)
            comment.refresh_from_db()
            return Response({'liked': False, 'likes_count': max(0, comment.likes_count)})
        else:
            CommentLike.objects.create(comment=comment, user=user)
            VideoComment.objects.filter(id=comment.id).update(likes_count=F('likes_count') + 1)
            comment.refresh_from_db()
            return Response({'liked': True, 'likes_count': comment.likes_count})
