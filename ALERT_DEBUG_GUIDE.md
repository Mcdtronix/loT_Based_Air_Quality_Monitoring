# Alert System Debugging Guide

## Quick Test

Run this to see what's happening with alert creation:

```bash
cd /home/aqi/Documents/Projects/Air_Quality_Monitor/Backend
source env/bin/activate
python test_alert_manual.py
```

This will:
1. Show the last sensor reading created
2. Check why alert wasn't generated
3. Try to manually create an alert
4. Show all alerts in the database

---

## Issue Checklist

If no alert appears after sending a reading, check:

### 1. Is the reading being saved?
```bash
sqlite3 db.sqlite3 "SELECT * FROM airquality_sensorreading ORDER BY timestamp DESC LIMIT 1;"
```
Expected: Should show your recent reading with AQI value

### 2. Are alerts in the database?
```bash
sqlite3 db.sqlite3 "SELECT id, device_id, alert_type, aqi, message FROM airquality_alert ORDER BY timestamp DESC LIMIT 10;"
```
Expected: Should show alerts if any were created

### 3. Check device relationships
```bash
sqlite3 db.sqlite3 "SELECT id, device_id, device_name, user_id FROM airquality_device;"
```
Expected: Should show your test device with device_id="001"

### 4. Check the alert service logic step-by-step

Import the service manually:
```bash
python manage.py shell
```

Then in the Python shell:
```python
from airquality.models import SensorReading, Device, Alert
from airquality.alert_service import AlertService
import logging

logging.basicConfig(level=logging.DEBUG)

# Get last reading
reading = SensorReading.objects.latest('timestamp')
print(f"Reading ID: {reading.id}, AQI: {reading.aqi}, Device: {reading.device}")

# Get previous
prev = SensorReading.objects.filter(
    device=reading.device, 
    timestamp__lt=reading.timestamp
).order_by('-timestamp').first()
print(f"Previous: {prev}")

# Check alert logic
should_alert, alert_type, reason = AlertService.should_alert_on_trend_change(
    reading.device, reading.aqi, prev.aqi if prev else reading.aqi
)
print(f"Should alert: {should_alert}, Type: {alert_type}, Reason: {reason}")

# Check first reading logic
if not should_alert and not prev and reading.aqi >= 150:
    print("✓ First reading with high AQI - should alert!")

# Check suppression
is_suppressed = AlertService.should_suppress_alert(reading.device, alert_type or 'danger')
print(f"Suppressed: {is_suppressed}")

# Create alert manually
alert = AlertService.create_alert(reading.device, 'danger', f'Test alert AQI {reading.aqi}', reading.aqi)
print(f"Created alert: {alert.id}")

# Check if it exists
count = Alert.objects.filter(device=reading.device).count()
print(f"Total alerts: {count}")

exit()
```

---

## Expected Behavior

For AQI 338 with no previous reading:
```
✓ should_alert = True (first reading with AQI >= 150)
✓ alert_type = "danger" (338 >= 200)
✓ reason = "Initial reading: Hazardous"
✓ Suppressed = False (no previous alerts)
✓ Alert created successfully
```

---

## Common Issues

| Issue | Solution |
|-------|----------|
| Reading saved but alert not created | Run `test_alert_manual.py` to debug |
| Alert suppressed | Delete recent alerts: `sqlite3 db.sqlite3 "DELETE FROM airquality_alert;"` |
| AlertService import error | Make sure `alert_service.py` exists in `/Backend/airquality/` |
| Database locked | Stop Django server, wait 2 sec, restart |

---

## Enable Request Logging

To see when readings are uploaded, add this to your Django terminal:

```bash
# In the Django runserver terminal, you should see:
[28/May/2026 19:40:19] "POST /api/readings/upload/ HTTP/1.1" 201
```

Look for `201` status (success) after each curl command.
