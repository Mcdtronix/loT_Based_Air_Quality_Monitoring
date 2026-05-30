#!/usr/bin/env python
"""
Test alert system by creating sensor readings with increasing AQI
"""
import os
import django
import sys

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Core.settings')
sys.path.insert(0, '/home/aqi/Documents/Projects/Air_Quality_Monitor/Backend')
django.setup()

from django.contrib.auth import get_user_model
from airquality.models import Device, SensorReading
from airquality.alert_service import AlertService
from datetime import datetime, timedelta

User = get_user_model()

def test_alert_system():
    """Create test readings and verify alerts are generated"""
    
    print("\n" + "="*60)
    print("AIR QUALITY ALERT SYSTEM TEST")
    print("="*60 + "\n")
    
    # Get or create test user
    user, _ = User.objects.get_or_create(
        username='testuser',
        defaults={'email': 'test@example.com'}
    )
    print(f"✓ Test User: {user.username}")
    
    # Get or create test device
    device, _ = Device.objects.get_or_create(
        user=user,
        device_id='TEST_DEVICE_001',
        defaults={'device_name': 'Test Sensor'}
    )
    print(f"✓ Test Device: {device.device_name} (ID: {device.device_id})\n")
    
    # Create readings with increasing AQI to trigger alerts
    test_cases = [
        {'aqi': 50, 'name': 'Good'},
        {'aqi': 80, 'name': 'Moderate'},
        {'aqi': 150, 'name': 'Unhealthy for Sensitive Groups'},
        {'aqi': 210, 'name': 'Unhealthy (SHOULD TRIGGER DANGER ALERT)'},
        {'aqi': 100, 'name': 'Back to Moderate (SHOULD TRIGGER INFO ALERT)'},
    ]
    
    print("Creating test sensor readings...\n")
    
    for i, test in enumerate(test_cases):
        # Create reading
        timestamp = datetime.now() - timedelta(minutes=(len(test_cases) - i - 1))
        
        reading = SensorReading.objects.create(
            device=device,
            aqi=test['aqi'],
            timestamp=timestamp,
            temperature=22,
            humidity=50,
            pm25=test['aqi'] * 0.4,  # Rough estimate
            pm10=test['aqi'] * 0.6,
            no2=test['aqi'] * 0.3,
            so2=test['aqi'] * 0.2,
        )
        
        print(f"📊 Reading {i+1}: AQI={test['aqi']} ({test['name']})")
        
        # Process for alerts
        alert = AlertService.process_reading(reading)
        
        if alert:
            print(f"   🚨 ALERT CREATED: [{alert.alert_type.upper()}] {alert.message}")
        else:
            print(f"   ℹ️  No alert (first reading or stable level)")
        
        print()
    
    # Show all alerts
    print("\n" + "-"*60)
    print("ALL ALERTS IN DATABASE:")
    print("-"*60 + "\n")
    
    alerts = Device.objects.get(device_id='TEST_DEVICE_001').alert_set.all()
    
    if alerts.exists():
        for alert in alerts:
            print(f"✓ [{alert.alert_type}] {alert.message}")
            print(f"  Time: {alert.timestamp}")
            print(f"  Read: {alert.read}\n")
    else:
        print("ℹ️  No alerts found (check if readings were processed)\n")
    
    print("="*60)
    print("TEST COMPLETE")
    print("="*60 + "\n")

if __name__ == '__main__':
    test_alert_system()
