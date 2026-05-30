# Alert Generation - Quick Fix Reference

## 🎯 TL;DR - The Issue

**Notifications work → Manual alerts work → Automatic alerts broken** means the problem is in `AlertService.process_reading()` - it's either:

1. ❌ Not being called
2. ❌ Returning None (no alert conditions met)
3. ❌ Throwing an exception (silently caught)

---

## ⚡ Quick Diagnostic (2 minutes)

```bash
cd /home/aqi/Documents/Projects/Air_Quality_Monitor/Backend
source env/bin/activate
python diagnostic_alerts.py
```

**This tells you:**
- ✓ What devices exist
- ✓ What readings are in DB
- ✓ Why alert might not trigger
- ✓ Suppression status

---

## 🔴 Most Common Fix

### Problem: Device Name Mismatch

```bash
# WRONG:
curl ... -d '{"device_name": "My Device", "aqi": 250}'

# Get exact name from backend first:
sqlite3 db.sqlite3 "SELECT device_name FROM airquality_device;"

# RIGHT:
curl ... -d '{"device_name": "Exact Name From DB", "aqi": 250}'
```

---

## 🟡 Second Most Common Fix

### Problem: AQI Not Changing Enough

Alerts trigger on **change**, not just on value alone:

```
Reading 1: AQI = 50   → No alert (first reading, low AQI)
Reading 2: AQI = 50   → No alert (same as before!)
Reading 3: AQI = 250  → ✅ ALERT! (Big change detected)
```

**Solution**: Send readings with **different** AQI values

---

## 🟢 Testing Right Now

### Step 1: Check What's in Database
```bash
sqlite3 db.sqlite3 "SELECT device_name, COUNT(*) as readings FROM \
  airquality_sensorreading JOIN airquality_device ON \
  airquality_sensorreading.device_id = airquality_device.id \
  GROUP BY device_name;"
```

### Step 2: Start Django & Watch Logs
```bash
python manage.py runserver
# Keep this terminal visible - watch for [ALERT_DEBUG] messages!
```

### Step 3: Send Test Reading (NEW TERMINAL)
```bash
# Use EXACT device name from DB!
curl -X POST http://localhost:8000/api/readings/upload/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "device_id": "001",
    "device_name": "YOUR_EXACT_DEVICE_NAME_HERE",
    "aqi": 250,
    "pm25": 120,
    "pm10": 200,
    "co2": 500,
    "humidity": 65,
    "temperature": 22
  }'
```

### Step 4: Check Django Terminal
Look for:
```
[ALERT_DEBUG] Processing reading for ... Current AQI: 250
[ALERT_DEBUG] Previous AQI: ..., Previous reading exists: ...
[ALERT_DEBUG] Trend check — should_alert: True, type: danger, reason: ...
[ALERT_DEBUG] Creating danger alert — Message: ...
```

### Step 5: Verify Alert Was Created
```bash
sqlite3 db.sqlite3 "SELECT timestamp, alert_type, message FROM \
  airquality_alert ORDER BY timestamp DESC LIMIT 1;"
```

Should show your new alert!

---

## 🔧 If Still Broken

Check these in order:

| Check | Command | Fix |
|-------|---------|-----|
| Device exists? | `sqlite3 db.sqlite3 "SELECT device_name FROM airquality_device LIMIT 1;"` | Register in app |
| Readings saved? | `sqlite3 db.sqlite3 "SELECT COUNT(*) FROM airquality_sensorreading;"` | Send readings first |
| Alerts exist? | `sqlite3 db.sqlite3 "SELECT COUNT(*) FROM airquality_alert;"` | Should be > 0 after test |
| Suppressed? | `sqlite3 db.sqlite3 "SELECT MAX(timestamp) FROM airquality_alert WHERE alert_type='danger';"` | Wait 30 min or change type |

---

## 📝 Copy-Paste Commands

### Get Your Device Name
```bash
sqlite3 db.sqlite3 "SELECT device_name FROM airquality_device;"
```

### Check All Readings
```bash
sqlite3 db.sqlite3 "SELECT timestamp, aqi FROM airquality_sensorreading ORDER BY timestamp DESC LIMIT 10;"
```

### Check All Alerts
```bash
sqlite3 db.sqlite3 "SELECT timestamp, alert_type, message FROM airquality_alert ORDER BY timestamp DESC LIMIT 10;"
```

### Delete Old Alerts (Clear Suppression)
```bash
sqlite3 db.sqlite3 "DELETE FROM airquality_alert WHERE timestamp < datetime('now', '-1 day');"
```

### Run Full Diagnostic
```bash
cd Backend && source env/bin/activate && python diagnostic_alerts.py
```

---

## 🚀 Expected Behavior (Working System)

```
Send reading with AQI 250
    ↓ (1 second)
Backend processes: [ALERT_DEBUG] messages show
    ↓ (1 second)
Alert saved to DB: sqlite3 query shows it
    ↓ (5 seconds)
Frontend polls: receives new alert
    ↓ (instant)
Notification appears on screen: 🚨 Toast notification
```

**Total time: ~6 seconds from sensor to app notification**

