from rest_framework import serializers
from .models import ServiceCategory, WorkerProfile, PortfolioItem, Review
from apps.authentication.serializers import UserSerializer

class ServiceCategorySerializer(serializers.ModelSerializer):
    worker_count = serializers.SerializerMethodField()

    class Meta:
        model = ServiceCategory
        fields = ['id', 'name', 'slug', 'icon', 'color', 'description', 'worker_count']

    def get_worker_count(self, obj):
        return obj.workers.count()

class PortfolioItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = PortfolioItem
        fields = ['id', 'title', 'category', 'location', 'image_url', 'description', 'created_at']

class ReviewSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source='client.full_name', read_only=True)
    client_avatar = serializers.CharField(source='client.resolved_avatar', read_only=True)

    class Meta:
        model = Review
        fields = ['id', 'client_name', 'client_avatar', 'rating', 'job_title', 'comment', 'location', 'created_at']

class WorkerProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    display_name = serializers.CharField(source='user.full_name', read_only=True)
    avatar = serializers.CharField(source='user.resolved_avatar', read_only=True)
    languages = serializers.ListField(source='user.languages', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True, default='')
    portfolio_items = PortfolioItemSerializer(many=True, read_only=True)
    reviews = ReviewSerializer(many=True, read_only=True)

    class Meta:
        model = WorkerProfile
        fields = [
            'id', 'user', 'display_name', 'avatar', 'profession', 'category',
            'category_name', 'bio', 'languages', 'years_experience', 'service_area',
            'service_radius_km', 'latitude', 'longitude', 'callout_rate',
            'currency', 'country', 'city', 'phone_number', 'whatsapp_number',
            'payout_method', 'payout_details',
            'rating', 'review_count', 'completed_jobs',
            'is_verified', 'verification_badge', 'is_online',
            'avg_response_mins', 'specialisms', 'is_available',
            'portfolio_items', 'reviews', 'created_at'
        ]
