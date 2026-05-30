# Testing the Alert System

## Prerequisites
- Backend server running: `python manage.py runserver`
- Frontend app running on device/emulator
- You have a valid auth token

## Step 1: Get Your Auth Token

Login and copy your token from:
- localStorage in browser DevTools, or
- Check your Django admin panel

## Step 2: Create Test Sensor Readings

Use these curl commands to send readings that will trigger alerts:

### Reading 1: Normal Air (No Alert)
```bash
curl -X POST http://localhost:8000/api/readings/upload/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "device_id": "YOUR_DEVICE_ID",
    "device_name": "Test Device",
    "aqi": 50,
    "pm25": 20,
    "pm10": 30,
    "no2": 15,
    "so2": 5
  }'
```

### Reading 2: Poor Air (Triggers WARNING Alert)
Wait 2-3 seconds, then send:
```bash
curl -X POST http://localhost:8000/api/readings/upload/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "device_id": "YOUR_DEVICE_ID",
    "device_name": "Test Device",
    "aqi": 180,
    "pm25": 70,
    "pm10": 110,
    "no2": 50,
    "so2": 20
  }'
```

### Reading 3: Critical Air (Triggers DANGER Alert)
Wait 2-3 seconds, then send:
```bash
curl -X POST http://localhost:8000/api/readings/upload/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "device_id": "YOUR_DEVICE_ID",
    "device_name": "Test Device",
    "aqi": 250,
    "pm25": 120,
    "pm10": 200,
    "no2": 100,
    "so2": 50
  }'
```

## Step 3: Check Results

### In Backend Terminal
Look for log messages like:
```
[ALERT] Alert triggered for Test Device: ...
```

### In Frontend Terminal
Look for log messages like:
```
LOG  [AlertNotification] Warning alert: ...
LOG  [NotificationService] Showing toast...
```

### In App
- Alerts should appear in the "Alerts" tab
- Toast notifications should appear at top of screen with haptic/sound feedback

## Step 4: Troubleshooting

### No alerts in backend?
Check Django logs for:
```
[ALERT_ERROR] Failed to process alert...
```

Run the debug script:
```bash
cd Backend
source env/bin/activate
python debug_alerts.py
```

### No notifications in frontend?
Check frontend logs for:
```
ERROR  [TypeError: Cannot read property...]
```
This should now be fixed!

### Alerts not appearing in Alerts tab?
- Verify you're on the Alerts screen
- Check if alerts are being fetched: DevTools console should show API calls
- Try refreshing the app

## How Alerts Work Now

1. **First reading with AQI ≥ 150**: Generates initial WARNING or DANGER alert
2. **AQI goes DOWN**: Generates INFO alert if improvement > 40 points
3. **AQI goes UP**: Generates WARNING or DANGER alert based on level change
4. **Same level**: No new alert (prevents spam)
5. **Same alert type within 30 min**: Suppressed (prevents spam)

## Expected Behavior

```
Good (AQI 50) → Unhealthy (AQI 180)
✅ Generates: WARNING alert

Unhealthy (AQI 180) → Hazardous (AQI 250)
✅ Generates: DANGER alert

Hazardous (AQI 250) → Moderate (AQI 100)
✅ Generates: INFO alert (improvement!)
```
