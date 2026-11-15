from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import TemplateView
from apps.authentication.views import FileUploadView

# LocalFix Custom Admin Branding
admin.site.site_header = "⚡ LocalFix Platform Control Hub"
admin.site.site_title = "LocalFix Admin"
admin.site.index_title = "Hyperlocal Escrow & Artisan Mesh Hub"

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/upload/', FileUploadView.as_view(), name='file_upload'),
    path('api/auth/', include('apps.authentication.urls')),
    path('api/services/', include('apps.services.urls')),
    path('api/bookings/', include('apps.bookings.urls')),
    path('api/escrow/', include('apps.escrow.urls')),
    path('api/disputes/', include('apps.disputes.urls')),
    path('api/marketplace/', include('apps.marketplace.urls')),
    path('api/feed/', include('apps.feed.urls')),
    path('api/chat/', include('apps.chat.urls')),
    path('api/assistant/', include('apps.assistant.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

# Single-Page Application (SPA) catch-all for unified frontend + backend hosting
# Any route not starting with api/, admin/, media/, or static/ serves the React index.html
if getattr(settings, 'FRONTEND_DIST_DIR', None) and (settings.FRONTEND_DIST_DIR / 'index.html').exists():
    urlpatterns += [
        re_path(r'^(?!api/|admin/|media/|static/).*$', TemplateView.as_view(template_name='index.html')),
    ]
