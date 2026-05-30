#!/usr/bin/env python
"""
Manually test alert generation
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

print("\n" + "="*70)
print("MANUAL ALERT TEST")
print("="*70 + "\n")

# Get first user
user = User.objects.first()
if not user:
    print("❌ No users found!")
    sys.exit(1)

print(f"Using user: {user.username}\n")

# Get first device
device = Device.objects.first()
if not device:
    print("❌ No devices found!")
    sys.exit(1)

print(f"Using device: {device.device_name} (ID: {device.id})\n")

# Get last reading
last_reading = SensorReading.objects.filter(device=device).order_by('-timestamp').first()

if last_reading:
    print(f"Last reading ID: {last_reading.id}")
    print(f"Last reading AQI: {last_reading.aqi}")
    print(f"Last reading timestamp: {last_reading.timestamp}\n")
else:
    print("No readings found for this device\n")

# Get all alerts
alerts_count = Alert.objects.filter(device=device).count()
print(f"Total alerts for device: {alerts_count}\n")

# Now manually process the last reading
if last_reading:
    print("Processing reading through AlertService...\n")
    
    # Get previous reading comparision
    prev = SensorReading.objects.filter(
        device=device,
        timestamp__lt=last_reading.timestamp
    ).order_by('-timestamp').first()
    
    print(f"Previous reading: {prev}")
    
    # Check trend
    should_alert, alert_type, reason = AlertService.should_alert_on_trend_change(
        device, last_reading.aqi, prev.aqi if prev else last_reading.aqi
    )
    print(f"\nshould_alert: {should_alert}")
    print(f"alert_type: {alert_type}")
    print(f"reason: {reason}\n")
    
    # Check first reading logic
    if not should_alert and not prev and last_reading.aqi >= 150:
        print(f"✓ Would trigger first reading alert (AQI {last_reading.aqi} >= 150)")
        should_alert = True
        alert_type = "warning" if last_reading.aqi < 200 else "danger"
        reason = f"Initial reading: {AlertService.get_aqi_level(last_reading.aqi)[0]}"
        print(f"  Type: {alert_type}")
        print(f"  Reason: {reason}\n")
    
    if should_alert:
        # Check suppression
        is_suppressed = AlertService.should_suppress_alert(device, alert_type)
        print(f"Suppressed: {is_suppressed}\n")
        
        if not is_suppressed:
            # Try to create
            print("Creating alert...\n")
            aqi_level, _ = AlertService.get_aqi_level(last_reading.aqi)
            message = f"{reason} (AQI: {last_reading.aqi}, Level: {aqi_level})"
            
            alert = AlertService.create_alert(device, alert_type, message, last_reading.aqi)
            print(f"✅ Alert created: {alert}")
            print(f"   ID: {alert.id}")
            print(f"   Type: {alert.alert_type}")
            print(f"   Message: {alert.message}")
    else:
        print("❌ Alert not triggered")
    
    # Now check alerts again
    print("\n" + "-"*70)
    alerts = Alert.objects.filter(device=device).order_by('-timestamp')[:5]
    print(f"Recent alerts ({len(alerts)}):\n")
    for alert in alerts:
        print(f"  [{alert.alert_type}] {alert.message}")
        print(f"  ID: {alert.id}, Time: {alert.timestamp}, Read: {alert.read}\n")

print("="*70 + "\n")
