from django.contrib import admin
from .models import VideoPost, VideoComment, VideoLike, VideoSave

@admin.register(VideoPost)
class VideoPostAdmin(admin.ModelAdmin):
    list_display = ('title', 'creator', 'category', 'likes_count', 'views_count', 'is_official', 'created_at')
    list_filter = ('category', 'is_official')
    search_fields = ('title', 'description', 'creator__first_name', 'creator__last_name')

@admin.register(VideoComment)
class VideoCommentAdmin(admin.ModelAdmin):
    list_display = ('user', 'video', 'text', 'is_pinned', 'created_at')
