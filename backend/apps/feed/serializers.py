from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import VideoPost, VideoComment, VideoLike, VideoSave, CommentLike

User = get_user_model()

class VideoCommentSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.full_name', read_only=True)
    user_avatar = serializers.CharField(source='user.resolved_avatar', read_only=True)
    user_role = serializers.CharField(source='user.role', read_only=True)
    replies = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()

    class Meta:
        model = VideoComment
        fields = ['id', 'video', 'user', 'user_name', 'user_avatar', 'user_role', 'text', 'is_pinned', 'likes_count', 'is_liked', 'parent', 'replies', 'created_at']
        read_only_fields = ['id', 'video', 'user', 'likes_count', 'created_at']

    def _get_effective_user(self):
        request = self.context.get('request')
        if not request:
            return None
        if hasattr(request, 'user') and request.user and request.user.is_authenticated:
            return request.user
        return User.objects.filter(role='customer').first() or User.objects.first()

    def get_is_liked(self, obj):
        user = self._get_effective_user()
        if user:
            return CommentLike.objects.filter(comment=obj, user=user).exists()
        return False

    def get_replies(self, obj):
        if obj.parent is None:
            return VideoCommentSerializer(obj.replies.all(), many=True, context=self.context).data
        return []

class VideoPostSerializer(serializers.ModelSerializer):
    creator_name = serializers.CharField(source='creator.full_name', read_only=True)
    creator_avatar = serializers.CharField(source='creator.resolved_avatar', read_only=True)
    creator_is_verified = serializers.BooleanField(source='creator.is_verified', read_only=True)
    creator_badge = serializers.SerializerMethodField()
    creator_handle = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()
    is_saved = serializers.SerializerMethodField()
    top_comments = serializers.SerializerMethodField()

    class Meta:
        model = VideoPost
        fields = [
            'id', 'creator', 'creator_name', 'creator_avatar', 'creator_is_verified',
            'creator_badge', 'creator_handle', 'title', 'description', 'video_url',
            'thumbnail_url', 'category', 'hashtags', 'location_name', 'likes_count',
            'comments_count', 'shares_count', 'saves_count', 'views_count',
            'duration_seconds', 'is_official', 'is_liked', 'is_saved', 'top_comments',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'creator', 'likes_count', 'comments_count', 'shares_count', 'saves_count', 'views_count', 'created_at', 'updated_at']

    def get_creator_badge(self, obj):
        if hasattr(obj.creator, 'worker_profile'):
            return obj.creator.worker_profile.verification_badge or 'Vetted Pro'
        return 'LocalFix Certified' if obj.is_official else 'Community Contributor'

    def get_creator_handle(self, obj):
        return f"@{obj.creator.first_name}{obj.creator.last_name}".replace(' ', '')

    def _get_effective_user(self):
        request = self.context.get('request')
        if not request:
            return None
        if hasattr(request, 'user') and request.user and request.user.is_authenticated:
            return request.user
        return User.objects.filter(role='customer').first() or User.objects.first()

    def get_is_liked(self, obj):
        user = self._get_effective_user()
        if user:
            return VideoLike.objects.filter(video=obj, user=user).exists()
        return False

    def get_is_saved(self, obj):
        user = self._get_effective_user()
        if user:
            return VideoSave.objects.filter(video=obj, user=user).exists()
        return False

    def get_top_comments(self, obj):
        comments = obj.comments.filter(parent=None)[:3]
        return VideoCommentSerializer(comments, many=True).data
