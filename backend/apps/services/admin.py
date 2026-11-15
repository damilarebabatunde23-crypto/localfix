from django.contrib import admin
from .models import ServiceCategory, WorkerProfile, PortfolioItem, Review

class PortfolioItemInline(admin.TabularInline):
    model = PortfolioItem
    extra = 1

class ReviewInline(admin.TabularInline):
    model = Review
    extra = 0
    readonly_fields = ('created_at',)

@admin.register(ServiceCategory)
class ServiceCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'icon', 'color', 'order')
    prepopulated_fields = {'slug': ('name',)}

@admin.register(WorkerProfile)
class WorkerProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'profession', 'category', 'callout_rate', 'rating', 'completed_jobs', 'is_verified', 'is_online')
    list_filter = ('category', 'is_verified', 'is_online', 'service_area')
    search_fields = ('user__first_name', 'user__last_name', 'profession', 'service_area')
    inlines = [PortfolioItemInline, ReviewInline]

@admin.register(PortfolioItem)
class PortfolioItemAdmin(admin.ModelAdmin):
    list_display = ('title', 'worker', 'category', 'location', 'created_at')

@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ('worker', 'client', 'rating', 'job_title', 'location', 'created_at')
    list_filter = ('rating',)
