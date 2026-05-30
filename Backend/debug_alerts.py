#!/usr/bin/env python
"""
Debug alert generation directly
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Core.settings')
sys.path.insert(0, '/home/aqi/Documents/Projects/Air_Quality_Monitor/Backend')
django.setup()

from django.contrib.auth import get_user_model
from airquality.models import Device, SensorReading, Alert
from airquality.alert_service import AlertService
from django.utils import timezone

User = get_user_model()

# Get test user/device
user = User.objects.first()
if not user:
    print("❌ No users found. Create a user first!")
    sys.exit(1)

devices = Device.objects.filter(user=user)
if not devices.exists():
    print("❌ No devices found for this user!")
    sys.exit(1)

device = devices.first()

print("\n" + "="*70)
print("ALERT SERVICE DEBUG")
print("="*70)
print(f"\nUser: {user.username}")
print(f"Device: {device.device_name} (ID: {device.device_id})\n")

# Get last reading
last_reading = SensorReading.objects.filter(device=device).order_by('-timestamp').first()

if last_reading:
    print(f"📊 Last Reading:")
    print(f"   AQI: {last_reading.aqi}")
    print(f"   Time: {last_reading.timestamp}")
    print(f"   Level: {AlertService.get_aqi_level(last_reading.aqi)[0]}\n")
else:
    print("⚠️  No readings found for this device\n")

# Test creating readings with different AQI levels
print("Testing alert generation...\n")

test_aqi_values = [50, 100, 150, 210, 100]

for i, aqi in enumerate(test_aqi_values):
    print(f"Test {i+1}: Creating reading with AQI={aqi}")
    
    reading = SensorReading.objects.create(
        device=device,
        aqi=aqi,
        pm25=aqi * 0.4,
        pm10=aqi * 0.6,
        no2=aqi * 0.3,
        so2=aqi * 0.2,
        temperature=22,
        humidity=50
    )
    
    # Check alert logic
    previous = SensorReading.objects.filter(
        device=device,
        timestamp__lt=reading.timestamp
    ).exclude(id=reading.id).order_by('-timestamp').first()
    
    if previous:
        print(f"   Previous AQI: {previous.aqi}")
        should_alert, alert_type, reason = AlertService.should_alert_on_trend_change(
            device, aqi, previous.aqi
        )
        print(f"   Should Alert: {should_alert}")
        if should_alert:
            print(f"   Type: {alert_type}")
            print(f"   Reason: {reason}")
            
            # Check suppression
            is_suppressed = AlertService.should_suppress_alert(device, alert_type)
            print(f"   Suppressed: {is_suppressed}")
    else:
        print(f"   No previous reading (first reading)")
    
    # Call actual alert service
    alert = AlertService.process_reading(reading)
    
    if alert:
        print(f"   ✅ ALERT CREATED: [ID={alert.id}] {alert.message}")
    else:
        print(f"   ℹ️  No alert generated")
    
    print()

# Show all alerts
print("-"*70)
print("ALL ALERTS FOR THIS DEVICE:")
print("-"*70 + "\n")

alerts = Alert.objects.filter(device=device).order_by('-timestamp')

if alerts.exists():
    for alert in alerts:
        status = "📖 Read" if alert.read else "📕 Unread"
        print(f"{status} [{alert.alert_type.upper()}] {alert.message}")
        print(f"     Time: {alert.timestamp}\n")
else:
    print("No alerts found\n")

print("="*70 + "\n")
