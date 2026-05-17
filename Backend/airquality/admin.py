from django.contrib import admin
from .models import Profile, Device, SensorReading, Alert, TwoFactorToken

@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'phone', 'medical_condition', 'two_factor_enabled', 'created_at']
    list_filter = ['two_factor_enabled', 'created_at']

@admin.register(Device)
class DeviceAdmin(admin.ModelAdmin):
    list_display = ['device_id', 'device_name', 'user', 'is_online', 'last_updated']
    list_filter = ['is_online', 'created_at']

@admin.register(SensorReading)
class SensorReadingAdmin(admin.ModelAdmin):
    list_display = ['device', 'timestamp', 'pm25', 'pm10', 'co2', 'carbon_monoxide', 'nitrogen_oxide', 'aqi']
    list_filter = ['device', 'timestamp']
    readonly_fields = ['aqi']

@admin.register(Alert)
class AlertAdmin(admin.ModelAdmin):
    list_display = ['device', 'timestamp', 'alert_type', 'aqi', 'read']
    list_filter = ['alert_type', 'read']

@admin.register(TwoFactorToken)
class TwoFactorTokenAdmin(admin.ModelAdmin):
    list_display = ['user', 'token', 'created_at', 'expires_at', 'is_used', 'attempts']
    list_filter = ['is_used', 'created_at', 'expires_at']
    readonly_fields = ['token', 'session_token']
    search_fields = ['user__username', 'user__email']
