from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'profiles', views.ProfileViewSet, basename='profile')
router.register(r'devices', views.DeviceViewSet, basename='device')
router.register(r'readings', views.SensorReadingViewSet, basename='sensorreading')
router.register(r'alerts', views.AlertViewSet, basename='alert')

urlpatterns = [
    path('', include(router.urls)),
    path('healthz/', views.health_check, name='healthz'),
    path('auth/register/', views.RegisterView.as_view(), name='register'),
    path('auth/login/', views.LoginRequestView.as_view(), name='login'),
    path('auth/2fa/request/', views.Request2FAView.as_view(), name='request-2fa'),
    path('auth/2fa/verify/', views.Verify2FAView.as_view(), name='verify-2fa'),
]
