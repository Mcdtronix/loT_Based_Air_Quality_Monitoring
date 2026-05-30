#!/usr/bin/env python
"""
Professional Diagnostic: Alert Generation Issue Analysis
Traces entire flow from reading upload through alert creation
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
import logging

# Enable ALL logging
logging.basicConfig(
    level=logging.DEBUG,
    format='[%(levelname)s] %(message)s'
)

User = get_user_model()

print("\n" + "="*80)
print("PROFESSIONAL ALERT DIAGNOSTIC")
print("="*80 + "\n")

# ============================================================================
# SECTION 1: DATABASE STATE
# ============================================================================
print("[1] DATABASE STATE ANALYSIS")
print("-" * 80)

users = User.objects.all()
print(f"✓ Total users: {users.count()}")
for user in users:
    print(f"  - {user.username} (ID: {user.id})")

devices = Device.objects.all()
print(f"\n✓ Total devices: {devices.count()}")
for device in devices:
    reading_count = device.readings.count()
    alert_count = device.alerts.count()
    print(f"  - {device.device_name} (ID: {device.id})")
    print(f"    Readings: {reading_count}, Alerts: {alert_count}")

existing_alerts = Alert.objects.all()
print(f"\n✓ Total alerts in database: {existing_alerts.count()}")

# ============================================================================
# SECTION 2: LATEST READINGS
# ============================================================================
print("\n[2] READING ANALYSIS")
print("-" * 80)

readings = SensorReading.objects.all().order_by('-timestamp')[:10]
print(f"✓ Latest 10 readings:\n")

for i, reading in enumerate(readings, 1):
    print(f"  {i}. Device: {reading.device.device_name}")
    print(f"     AQI: {reading.aqi} | PM2.5: {reading.pm25} | Time: {reading.timestamp}")
    
    # Check for alerts for this reading
    related_alerts = Alert.objects.filter(device=reading.device).count()
    print(f"     Total device alerts: {related_alerts}")
    print()

# ============================================================================
# SECTION 3: ALERT THRESHOLD CHECK
# ============================================================================
print("[3] ALERT THRESHOLD ANALYSIS")
print("-" * 80)

if readings.exists():
    latest = readings.first()
    aqi_level, aqi_type = AlertService.get_aqi_level(latest.aqi)
    
    print(f"✓ Latest reading analysis:")
    print(f"  AQI Value: {latest.aqi}")
    print(f"  AQI Level: {aqi_level}")
    print(f"  AQI Type: {aqi_type}")
    
    # Check what threshold this crosses
    if latest.aqi < 50:
        print(f"  Status: GOOD (0-50) — Should NOT trigger alerts")
    elif latest.aqi < 100:
        print(f"  Status: MODERATE (51-100) — Should NOT trigger alerts")
    elif latest.aqi < 150:
        print(f"  Status: USG (101-150) — Can trigger WARNING on first reading")
    elif latest.aqi < 200:
        print(f"  Status: UNHEALTHY (151-200) — Can trigger WARNING on first reading")
    elif latest.aqi < 300:
        print(f"  Status: VERY UNHEALTHY (201-300) — Can trigger DANGER on first reading")
    else:
        print(f"  Status: HAZARDOUS (>300) — Will trigger DANGER on first reading")
    
    # Check previous reading
    prev = SensorReading.objects.filter(
        device=latest.device,
        timestamp__lt=latest.timestamp
    ).order_by('-timestamp').first()
    
    if prev:
        print(f"\n  Previous reading:")
        print(f"    AQI: {prev.aqi} → {latest.aqi} (change: {latest.aqi - prev.aqi})")
        
        should_alert, alert_type, reason = AlertService.should_alert_on_trend_change(
            latest.device, latest.aqi, prev.aqi
        )
        print(f"    Trend check result: {should_alert} ({alert_type}: {reason})")
    else:
        print(f"\n  First reading detected!")
        if latest.aqi >= 150:
            print(f"    ✓ Should trigger initial alert (AQI {latest.aqi} >= 150)")
        else:
            print(f"    ✗ Will NOT trigger (AQI {latest.aqi} < 150)")

# ============================================================================
# SECTION 4: SUPPRESSION CHECK
# ============================================================================
print("\n[4] SUPPRESSION ANALYSIS")
print("-" * 80)

if devices.exists():
    device = devices.first()
    print(f"✓ Checking suppression for: {device.device_name}\n")
    
    for alert_type in ['danger', 'warning', 'info']:
        is_suppressed = AlertService.should_suppress_alert(device, alert_type)
        
        # Check recent alerts
        recent = Alert.objects.filter(
            device=device,
            alert_type=alert_type
        ).order_by('-timestamp').first()
        
        if recent:
            print(f"  {alert_type.upper()}:")
            print(f"    Last alert: {recent.timestamp}")
            print(f"    Suppressed now: {is_suppressed}")
        else:
            print(f"  {alert_type.upper()}:")
            print(f"    No recent alerts")
            print(f"    Suppressed now: False")
        print()

# ============================================================================
# SECTION 5: MANUAL ALERT CREATION TEST
# ============================================================================
print("[5] MANUAL ALERT CREATION TEST")
print("-" * 80)

if devices.exists() and readings.exists():
    device = devices.first()
    latest_reading = readings.first()
    
    print(f"\n✓ Attempting to manually create alert...\n")
    
    try:
        test_alert = AlertService.create_alert(
            device=device,
            alert_type='danger',
            message='[DIAGNOSTIC TEST] Manual alert creation test',
            aqi=latest_reading.aqi
        )
        
        if test_alert:
            print(f"  ✅ SUCCESS: Alert created (ID: {test_alert.id})")
            print(f"     Type: {test_alert.alert_type}")
            print(f"     Message: {test_alert.message}")
            print(f"     Read: {test_alert.read}\n")
            
            # Try to verify it's in the DB
            count = Alert.objects.filter(device=device).count()
            print(f"  ✓ Device now has {count} total alerts")
        else:
            print(f"  ❌ FAILED: createAlert returned None\n")
            
    except Exception as e:
        print(f"  ❌ ERROR: {str(e)}\n")
        import traceback
        traceback.print_exc()

# ============================================================================
# SECTION 6: RECOMMENDATIONS
# ============================================================================
print("[6] DIAGNOSTIC RECOMMENDATIONS")
print("-" * 80)

print("""
✓ If manual alerts work but automatic don't:
  1. Check device name matches exactly (case-sensitive)
  2. Verify AQI values are changing significantly
  3. Check for suppression window (30 minutes per type)

✓ Next steps:
  1. Send new sensor reading with DIFFERENT AQI value
  2. Watch Django logs: [ALERT_DEBUG] messages
  3. Check if alert appears in DB after reading
  4. If not, check [ALERT_ERROR] messages for exceptions

✓ To manually test from production:
  Get auth token → Send curl with varying AQI → Check logs
""")

print("="*80 + "\n")
