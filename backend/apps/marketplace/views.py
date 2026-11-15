from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Q, Count
from django.shortcuts import get_object_or_404
from apps.authentication.models import User
from .models import MarketplaceItem, MarketplaceSavedItem
from .serializers import MarketplaceItemSerializer

class MarketplaceItemListCreateView(generics.ListCreateAPIView):
    serializer_class = MarketplaceItemSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        queryset = MarketplaceItem.objects.select_related('seller', 'seller__worker_profile').all()

        category = self.request.query_params.get('category')
        if category and category.lower() != 'all categories':
            queryset = queryset.filter(category__iexact=category)

        condition = self.request.query_params.get('condition')
        if condition and condition.lower() != 'all conditions':
            queryset = queryset.filter(condition__iexact=condition)

        search_query = self.request.query_params.get('search')
        if search_query:
            queryset = queryset.filter(
                Q(title__icontains=search_query) |
                Q(description__icontains=search_query) |
                Q(location_name__icontains=search_query) |
                Q(category__icontains=search_query)
            )

        min_price = self.request.query_params.get('min_price')
        if min_price:
            try:
                queryset = queryset.filter(price__gte=float(min_price))
            except ValueError:
                pass

        max_price = self.request.query_params.get('max_price')
        if max_price:
            try:
                queryset = queryset.filter(price__lte=float(max_price))
            except ValueError:
                pass

        seller_id = self.request.query_params.get('seller_id')
        if seller_id:
            queryset = queryset.filter(seller_id=seller_id)

        return queryset

    def perform_create(self, serializer):
        user = self.request.user
        if not user or not user.is_authenticated:
            user = User.objects.filter(role='customer').first() or User.objects.first()
        serializer.save(seller=user)

class MarketplaceItemDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = MarketplaceItem.objects.select_related('seller', 'seller__worker_profile').all()
    serializer_class = MarketplaceItemSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = 'id'

    def perform_update(self, serializer):
        if serializer.instance.seller != self.request.user and not self.request.user.is_staff:
            raise permissions.exceptions.PermissionDenied("You can only edit your own listings.")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.seller != self.request.user and not self.request.user.is_staff:
            raise permissions.exceptions.PermissionDenied("You can only delete your own listings.")
        instance.delete()

class MarketplaceToggleSaveView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, id):
        item = get_object_or_404(MarketplaceItem, id=id)
        saved_obj = MarketplaceSavedItem.objects.filter(user=request.user, item=item).first()
        if saved_obj:
            saved_obj.delete()
            return Response({'saved': False, 'message': 'Item removed from saved.'})
        else:
            MarketplaceSavedItem.objects.create(user=request.user, item=item)
            return Response({'saved': True, 'message': 'Item saved to your bookmarks!'})

class MarketplaceSavedListView(generics.ListAPIView):
    serializer_class = MarketplaceItemSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        saved_item_ids = MarketplaceSavedItem.objects.filter(user=self.request.user).values_list('item_id', flat=True)
        return MarketplaceItem.objects.filter(id__in=saved_item_ids)

class MarketplaceCategoriesView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        categories = MarketplaceItem.objects.values('category').annotate(count=Count('id')).order_by('-count')
        return Response(list(categories))
