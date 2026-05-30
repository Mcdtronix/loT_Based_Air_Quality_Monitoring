# Professional Alert System Troubleshooting Guide

## 🔴 Issue Summary
- ✅ Manual alerts via Django admin work perfectly (notifications delivered)
- ❌ Automatic alerts from sensor readings NOT generating
- ❌ Zero alerts created in database when AQI changes
- **Root Cause**: `AlertService.process_reading()` is failing silently or not triggering alert conditions

---

## 🔍 Root Cause Analysis

### Why Manual Alerts Work
```
Admin panel → Alert.objects.create() 
    ↓
Alert saved to DB 
    ↓
Frontend polls /api/alerts/ 
    ↓
Gets alert → Notification system works perfectly ✅
```

### Why Automatic Alerts Don't Work
```
Sensor reading → Device.readings.create() 
    ↓
AlertService.process_reading() called 
    ├─ Current AQI = ? (possibly None, or same as before)
    ├─ Previous AQI = ?
    ├─ Check trend = Still okay? Maybe no change detected
    ├─ Check first reading = AQI >= 150? Maybe it's low
    └─ This function returns None (no alert) ❌
    
No alert created in DB
```

---

## 🧪 Diagnosis Steps

### Step 1: Run Diagnostic Script
```bash
cd /home/aqi/Documents/Projects/Air_Quality_Monitor/Backend
source env/bin/activate
python diagnostic_alerts.py
```

This will show:
- ✓ All devices and readings in database
- ✓ Latest AQI values
- ✓ Whether they meet alert thresholds
- ✓ Suppression status
- ✓ Manual alert creation test

### Step 2: Check Django Logs for Clues

Watch your `python manage.py runserver` terminal while sending a reading:

```bash
# Look for these messages:
[ALERT_DEBUG] Processing reading for DEVICE_NAME (Device ID: X) — Current AQI: Y
[ALERT_DEBUG] Previous AQI: Z, Previous reading exists: True/False
[ALERT_DEBUG] Trend check — should_alert: True/False, type: X, reason: Y
[ALERT_DEBUG] First reading with high AQI — Triggering danger alert
[ALERT_DEBUG] Alert suppressed for DEVICE_NAME
[ALERT_ERROR] Exception in process_reading: ...
```

### Step 3: Verify Device Setup

The device name in your app request **must match exactly** what's registered in Django:

```bash
# Check registered devices
curl http://localhost:8000/api/devices/ \
  -H "Authorization: Bearer YOUR_TOKEN"

# Response should show device names:
{
  "results": [
    {"device_name": "Kitchen Monitor", "device_id": "SENSOR_001"},
    {"device_name": "Living Room", "device_id": "SENSOR_002"}
  ]
}
```

When sending readings, use the **exact same device_name**:

```bash
curl -X POST http://localhost:8000/api/readings/upload/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "device_id": "SENSOR_001",
    "device_name": "Kitchen Monitor",  # Must match exactly!
    "aqi": 250,
    ...
  }'
```

---

## 🎯 Most Likely Issues & Fixes

### Issue 1: Device Name Mismatch
**Symptom**: Error "No registered device matches..."

**Fix**: 
```bash
# Get exact device names from your user
curl http://localhost:8000/api/devices/ -H "Authorization: Bearer TOKEN"

# Use exact name in subsequent readings
```

### Issue 2: AQI Not Changing
**Symptom**: Alert never triggers even with high AQI

**Root Cause**: Current reading has same AQI as previous
- Requirements: AQI must *change* to trigger trend-based alerts
- Or: First reading must have AQI >= 150

**Fix**:
```bash
# Reading 1: Create baseline (any AQI)
curl ... -d '{"aqi": 50, ...}'

# Reading 2: Change significantly
curl ... -d '{"aqi": 250, ...}'  # This should trigger DANGER

# Reading 3: Go back
curl ... -d '{"aqi": 50, ...}'   # This might trigger INFO
```

### Issue 3: Alert Suppressed
**Symptom**: Alert created once but not again

**Root Cause**: 30-minute suppression per alert type prevents spam

**Fix**:
```bash
# Check recent alerts
sqlite3 db.sqlite3 "SELECT timestamp, alert_type FROM airquality_alert WHERE device_id = YOUR_DEVICE_ID ORDER BY timestamp DESC LIMIT 10;"

# If recent DANGER alert exists, WARNING won't trigger for 30 min
# Send different alert type or wait 30 minutes
```

### Issue 4: AQI is NULL/None
**Symptom**: Alert processes but AQI shows as None

**Root Cause**: `compute_aqi()` method might be failing

**Fix**: Check SensorReading.compute_aqi() implementation:
```bash
python manage.py shell
from airquality.models import SensorReading
reading = SensorReading.objects.latest('timestamp')
reading.aqi = None
reading.save()  # Should auto-compute
print(reading.aqi)  # Should have value
```

---

## 🚀 Testing Workflow

### Complete Test Sequence

```bash
# 1. Stop Django, run diagnostic
python diagnostic_alerts.py

# 2. Note device names and current alert count

# 3. Start Django
python manage.py runserver

# 4. Get auth token (if needed)
curl -X POST http://localhost:8000/api/token/ \
  -d 'username=admin&password=YOUR_PASSWORD'

# 5. Send baseline reading (AQI < 150)
curl -X POST http://localhost:8000/api/readings/upload/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"device_id":"EXACT_DEVICE_ID","device_name":"EXACT_NAME","aqi":50,"pm25":20,"pm10":30,"co2":400,"humidity":60,"temperature":22}'

# 6. Watch Django logs for [ALERT_DEBUG] messages

# 7. Send danger reading (AQI > 200)
curl -X POST http://localhost:8000/api/readings/upload/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"device_id":"EXACT_DEVICE_ID","device_name":"EXACT_NAME","aqi":250,"pm25":120,"pm10":200,"co2":600,"humidity":60,"temperature":22}'

# 8. Check Django logs again - should see [ALERT_DEBUG] and alert creation

# 9. Verify alert in database
sqlite3 db.sqlite3 "SELECT * FROM airquality_alert ORDER BY timestamp DESC LIMIT 1;"

# 10. Verify notification arrived in app
# (Should appear in Alerts tab)
```

---

## 📋 Checklist for Production Testing

- [ ] Device is registered in Django admin
- [ ] Device name matches EXACTLY in API requests
- [ ] AQI value is computed (not NULL)
- [ ] AQI is changing between readings
- [ ] No recent alerts within 30-min suppression window
- [ ] Django console shows [ALERT_DEBUG] messages
- [ ] Alert appears in database after testing
- [ ] Frontend polls /api/alerts/ and receives alert
- [ ] Notification appears on screen

---

## 🔧 Advanced Debugging

### Enable Full SQL Query Logging
```bash
# Add to Django settings.py:
LOGGING = {
    'version': 1,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'loggers': {
        'django.db.backends': {
            'handlers': ['console'],
            'level': 'DEBUG',
        },
    },
}
```

### Check Alert Service Directly
```python
python manage.py shell

from airquality.models import SensorReading, Device
from airquality.alert_service import AlertService

# Get latest reading
reading = SensorReading.objects.latest('timestamp')

# Process it
alert = AlertService.process_reading(reading)
print(f"Alert created: {alert}")
print(f"Alert type: {alert.alert_type if alert else 'None'}")
print(f"Alert message: {alert.message if alert else 'None'}")
```

---

## 📞 If Issues Persist

1. **Run diagnostic**: `python diagnostic_alerts.py`
2. **Share output** with all [ALERT_DEBUG] and [ALERT_ERROR] messages
3. **Check Django logs** for exception tracebacks
4. **Verify database**: `sqlite3 db.sqlite3 "SELECT * FROM airquality_sensorreading ORDER BY timestamp DESC LIMIT 5;"`

