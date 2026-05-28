from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EmissionRecordViewSet, DataIngestionView

# Using DefaultRouter to automatically handle RESTful endpoints for the grid views
router = DefaultRouter()
router.register(r'records', EmissionRecordViewSet, basename='emission-record')

urlpatterns = [
    # Main REST framework endpoints (list, retrieve, update, approve, flag)
    path('', include(router.urls)),
    
    # Dedicated pipeline entry point for file ingestion processing
    path('upload/', DataIngestionView.as_view(), name='data-ingestion-upload'),
]