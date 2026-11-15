from django.urls import path
from .views import ServiceCategoryListView, WorkerProfileListView, WorkerProfileDetailView

urlpatterns = [
    path('categories/', ServiceCategoryListView.as_view(), name='service_categories'),
    path('workers/', WorkerProfileListView.as_view(), name='workers_list'),
    path('workers/<uuid:id>/', WorkerProfileDetailView.as_view(), name='worker_detail'),
]
