"""
URL configuration for core project.
"""
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    # Admin Panel (optional, but good for manual database verification)
    path('admin/', admin.site.urls),
    
    # Root API registration point
    path('api/', include('ingestion.urls')),
]