from rest_framework import generics, permissions
from django.db.models import Q
from .models import ServiceCategory, WorkerProfile
from .serializers import ServiceCategorySerializer, WorkerProfileSerializer

class ServiceCategoryListView(generics.ListAPIView):
    queryset = ServiceCategory.objects.all()
    serializer_class = ServiceCategorySerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

class WorkerProfileListView(generics.ListAPIView):
    serializer_class = WorkerProfileSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        queryset = WorkerProfile.objects.select_related('user', 'category').prefetch_related('portfolio_items', 'reviews').all()
        
        category_slug = self.request.query_params.get('category')
        if category_slug:
            queryset = queryset.filter(category__slug=category_slug)
            
        search_query = self.request.query_params.get('search')
        if search_query:
            queryset = queryset.filter(
                Q(user__first_name__icontains=search_query) |
                Q(user__last_name__icontains=search_query) |
                Q(profession__icontains=search_query) |
                Q(service_area__icontains=search_query) |
                Q(bio__icontains=search_query)
            )
            
        verified_only = self.request.query_params.get('verified')
        if verified_only and verified_only.lower() in ('true', '1'):
            queryset = queryset.filter(is_verified=True)

        return queryset

class WorkerProfileDetailView(generics.RetrieveAPIView):
    queryset = WorkerProfile.objects.select_related('user', 'category').prefetch_related('portfolio_items', 'reviews').all()
    serializer_class = WorkerProfileSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = 'id'
