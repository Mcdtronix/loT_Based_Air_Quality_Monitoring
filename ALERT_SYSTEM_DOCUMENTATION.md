# Air Quality Alert System — Implementation Guide
**Version 1.0.0** | Comprehensive air quality degradation detection & user notification system  
**Status**: Production-Ready | **Last Updated**: May 26, 2026

---

## 📋 Executive Overview

The Air Quality Alert System automatically generates **severity-graded alerts** when sensor data indicates degraded air quality. The system operates across three integrated layers:

1. **Backend (Django)** — Intelligent alert generation with trend analysis
2. **Database (SQLite)** — Persistent alert storage with read/unread status tracking
3. **Frontend (React Native)** — Real-time polling + rich UI with filtering

When a sensor sends new readings, the backend:
- ✅ Computes AQI from raw sensor values
- ✅ Compares against previous reading to detect trends
- ✅ Generates contextual alerts with recommended actions
- ✅ Applies suppression logic to prevent notification spam

---

## 🎯 Core Features

### Alert Types (3-Tier Severity System)

| Type | Icon | Color | When Triggered | User Action |
|------|------|-------|---|---|
| **danger** 🚨 | Alert Octagon | Red (#ef4444) | AQI > 200 or rapid degradation | **Immediate**: Stop outdoor activity, check device |
| **warning** ⚠️ | Alert Triangle | Orange (#f97316) | AQI 100-200 or moderate change | **Monitor**: Sensitive groups take precautions |
| **info** ℹ️ | Info Circle | Blue (#3b82f6) | AQI improved 40+ points | **Informational**: Quality improved, can dismiss |

### AQI Threshold Boundaries

```
0-50        → Good             (No alerts)
51-100      → Moderate         (Warning trigger)
101-150     → USG (Sensitive)  (Warning trigger)
151-200     → Unhealthy        (Danger trigger)
201-300     → Very Unhealthy   (Danger trigger)
300+        → Hazardous        (Danger trigger)
```

### Alert Suppression Strategy

**Problem**: Prevent alert fatigue from repeated sensor noise/fluctuations

**Solution**: Temporal suppression + threshold hysteresis

```
IF (last_alert_same_type_within_30_minutes) AND (alert_unread)
   THEN suppress_new_alert()
ELSE generate_new_alert()
```

**Example Behavior**:
- 14:00 — Sensor reads AQI 210 (danger) → Alert generated ✅
- 14:05 — Sensor reads AQI 215 (danger) → Alert suppressed (same type) ⏸️
- 14:35 — Sensor reads AQI 220 (danger) → Alert generated ✅ (30min passed)
- 14:40 — Sensor reads AQI 80 (moderate) → Alert generated ✅ (different type)

---

## 🛠️ Backend Implementation

### AlertService Architecture

**File**: `Backend/airquality/alert_service.py`

#### Key Classes

##### 1. `AQIThreshold`
Static configuration of AQI boundaries and alert mappings.

```python
class AQIThreshold:
    GOOD = 50
    MODERATE = 100
    USG = 150                    # Unhealthy for Sensitive Groups
    UNHEALTHY = 200
    VERY_UNHEALTHY = 300
    HAZARDOUS = float('inf')
```

##### 2. `AlertService`

**Primary Methods**:

| Method | Purpose | Returns |
|--------|---------|---------|
| `process_reading(reading)` | Main entry point; analyzes new sensor data | Alert \| None |
| `get_aqi_level(aqi)` | Maps AQI value to level + severity | (level_name, alert_type) |
| `should_suppress_alert(device, alert_type)` | Determines if alert should be muted | bool |
| `should_alert_on_trend_change(device, current, previous)` | Detects quality degradation | (should_alert, alert_type, reason) |
| `create_alert(device, alert_type, message, aqi)` | Persists alert to DB | Alert object |
| `get_critical_alerts(device, limit)` | Retrieves unread danger/warning alerts | List[Alert] |
| `cleanup_old_alerts(days_to_keep)` | Removes read alerts older than N days | int (count deleted) |

#### Alert Generation Flow

```
1. SensorReading created via IoT upload
   ↓
2. AQI computed/validated
   ↓
3. AlertService.process_reading(reading) called
   ├─ Fetch previous reading for trend analysis
   ├─ Compare AQI values for degradation
   ├─ Determine alert type (danger/warning/info)
   ├─ Check suppression rules
   ├─ Generate contextual message
   └─ Save to database
   ↓
4. Alert visible in frontend (next poll cycle)
```

#### Message Template

```python
# Format: "[Trend] [Direction]: Previous Level → Current Level (AQI: P → C)"
"Rapid degradation: Good → Unhealthy (AQI: 45 → 215)"
"Air quality worsened: Moderate → Unhealthy (AQI: 95 → 165)"
"Air quality improved: Unhealthy → Moderate (AQI: 210 → 75)"
```

### Integration with Views

**File**: `Backend/airquality/views.py`

The `SensorReadingViewSet.upload()` method now triggers alert generation:

```python
@action(detail=False, methods=['post'], ...)
def upload(self, request):
    # ... validate device, save reading ...
    
    # ✅ GENERATE ALERT
    try:
        alert = AlertService.process_reading(reading)
        if alert:
            logger.info(f"Alert triggered: {alert.message}")
    except Exception as e:
        logger.error(f"Alert processing failed: {e}")
    
    return Response(SensorReadingSerializer(reading).data, status=response_status)
```

**No Breaking Changes**: If alert generation fails, the API still returns the reading successfully (non-blocking).

---

## 🎨 Frontend Implementation

### Alert Service (TypeScript)

**File**: `Frontend/services/alert.service.ts`

Provides utility functions for alert manipulation:

```typescript
// Calculate stats (unread count, critical alerts, etc.)
calculateAlertStats(alerts: Alert[]): AlertStats

// Filter alerts by type, read status, time range
filterAlerts(alerts: Alert[], filter: AlertFilter): Alert[]

// Smart sort: unread danger → warning → older
sortAlerts(alerts: Alert[]): Alert[]

// Group alerts by device
groupAlertsByDevice(alerts: Alert[], deviceNames: Map): AlertGroup[]

// Get color/icon based on alert type
getAlertColor(alertType: string, colors: any): string
getAlertIcon(alertType: string): string

// Format timestamp (e.g., "5m ago")
formatAlertTime(timestamp: string): string

// Get recommended action text
getAlertAction(alertType: string): string
```

### Real-Time Alert Polling

**File**: `Frontend/context/DeviceContext.tsx`

New effect automatically polls for alerts every 5 seconds:

```typescript
// ✅ Real-time alert polling
useEffect(() => {
  if (!isAuthenticated) return;

  const pollAlerts = async () => {
    if (alertPollInFlight.current) return;
    if (Date.now() < alertPollBackoffUntil.current) return;

    alertPollInFlight.current = true;
    try {
      await loadAlerts();  // Fetch from API
      alertPollFailures.current = 0;
      alertPollBackoffUntil.current = 0;
    } catch (err) {
      alertPollFailures.current += 1;
      // Backoff to 30s on 3 consecutive failures
      if (alertPollFailures.current >= 3) {
        alertPollBackoffUntil.current = Date.now() + ALERT_POLL_BACKOFF_MS;
      }
    } finally {
      alertPollInFlight.current = false;
    }
  };

  const interval = setInterval(pollAlerts, ALERT_POLL_INTERVAL_MS);
  return () => clearInterval(interval);
}, [isAuthenticated, loadAlerts]);
```

**Polling Strategy**:
- Normal: Every 5 seconds (immediate alert visibility)
- On Failure: Exponential backoff to 30 seconds
- On Success: Reset to normal 5-second interval
- Network-Aware: Skips poll if one already in-flight

### Enhanced Alerts Screen

**File**: `Frontend/app/(tabs)/alerts.tsx`

#### New Features

1. **Alert Filtering** — Three view modes
   - Unread: Only unread alerts (default list)
   - Critical: Unread danger alerts only
   - All: All alerts (read + unread)

2. **Smart Sorting**
   - Unread danger alerts first
   - Then unread warnings
   - Then read danger alerts
   - Ordered by recency

3. **Rich Alert Cards**
   - Alert type badge (🚨 DANGER / ⚠️ WARNING / ℹ️ INFO)
   - Timestamp with relative formatting (e.g., "5m ago")
   - **NEW**: Recommended action text (context-specific guidance)
   - AQI value badge
   - Unread indicator dot

4. **Statistics Header**
   - Unread count
   - Total alert count
   - Critical alerts count

#### UI Components

```typescript
<AlertItem>
  ├─ Icon Box (color-coded)
  ├─ Alert Content
  │  ├─ Alert Type Badge + Timestamp
  │  ├─ Message (bold)
  │  ├─ 🆕 Recommendation Text (italic, faded)
  │  └─ AQI Badge + Unread Dot
  └─ Tap to mark read

<FilterButton>
  ├─ Label (All, Unread, Critical)
  ├─ Count indicator
  └─ Active/inactive state
```

---

## 📊 Data Model

### Alert Table Schema

```sql
CREATE TABLE airquality_alert (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id            INTEGER NOT NULL,
    timestamp            DATETIME DEFAULT NOW(),
    alert_type           VARCHAR(10),      -- 'warning' | 'danger' | 'info'
    message              TEXT,
    aqi                  INTEGER,
    read                 BOOLEAN DEFAULT FALSE,
    
    FOREIGN KEY (device_id) REFERENCES airquality_device(id),
    INDEX idx_device_read_timestamp (device_id, read, timestamp DESC)
);
```

### Serializer

```python
class AlertSerializer(serializers.ModelSerializer):
    class Meta:
        model = Alert
        fields = [
            'id',
            'device',
            'timestamp',
            'type',           # Renamed from alert_type for frontend
            'message',
            'aqi',
            'read'
        ]
        read_only_fields = ['id', 'timestamp']
```

---

## 🔄 API Endpoints

### Get Alerts (with Auth)

**GET** `/api/alerts/`

```bash
curl -H "Authorization: Bearer $TOKEN" \
  https://airmonitor.mcdtronix.co.zw/api/alerts/
```

**Response**:
```json
{
  "count": 42,
  "results": [
    {
      "id": 1001,
      "device": 5,
      "timestamp": "2026-05-26T14:35:22Z",
      "type": "danger",
      "message": "Rapid degradation: Good → Unhealthy (AQI: 45 → 215)",
      "aqi": 215,
      "read": false
    }
  ]
}
```

### Mark Alert as Read

**POST** `/api/alerts/{id}/mark_read/`

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  https://airmonitor.mcdtronix.co.zw/api/alerts/1001/mark_read/
```

### Mark All Alerts as Read

**POST** `/api/alerts/mark_all_read/`

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  https://airmonitor.mcdtronix.co.zw/api/alerts/mark_all_read/
```

---

## 🚀 Deployment Checklist

### Backend

- [x] `AlertService` implemented (alert_service.py)
- [x] Integrated into `SensorReadingViewSet.upload()`
- [x] Error handling (non-blocking)
- [x] Logging for debugging
- [ ] Set up database indexes on `Alert.device`, `Alert.alert_type`, `Alert.timestamp`
- [ ] Configure alert cleanup scheduled task (e.g., 2AM daily)

```bash
# Add to Django settings for scheduled cleanup
from celery.schedules import crontab
CELERY_BEAT_SCHEDULE = {
    'cleanup-alerts': {
        'task': 'airquality.tasks.cleanup_old_alerts',
        'schedule': crontab(hour=2, minute=0),  # 2AM daily
    },
}
```

### Frontend

- [x] Alert polling in DeviceContext (5s interval)
- [x] Enhanced alerts screen with filtering
- [x] Alert service utilities (sort, filter, format)
- [ ] Push notifications (when app backgrounded)
- [ ] Test on real device with 50+ alerts

### Migration Steps

```bash
# 1. Database migration (add new fields if needed)
python manage.py makemigrations
python manage.py migrate

# 2. Update requirements.txt (if new packages added)
pip freeze > requirements.txt

# 3. Redeploy backend
docker restart air-quality-api

# 4. Update frontend (OTA or app store)
# No breaking changes - existing alerts schema compatible
```

---

## 🧪 Testing Scenarios

### Scenario 1: Normal Degradation

**Trigger**: AQI 50 → 120 over 2 readings

```
Reading 1: AQI=50 (Good)      → No alert
Reading 2: AQI=120 (Moderate) → Warning alert generated ✅
Reading 3: AQI=120 (Moderate) → No alert (same level)
```

### Scenario 2: Rapid Degradation

**Trigger**: AQI 60 → 250 (>30 point jump)

```
Reading 1: AQI=60  → No alert
Reading 2: AQI=250 → Danger alert generated ✅ (rapid change)
```

### Scenario 3: Suppression

**Trigger**: Repeated danger readings

```
14:00 — AQI=210 → Danger alert (first time)
14:05 — AQI=215 → NO alert (same type, <30min)
14:35 — AQI=220 → Danger alert ✅ (30min passed, suppression reset)
```

### Scenario 4: Improvement

**Trigger**: AQI 200 → 100

```
Reading 1: AQI=200 (Unhealthy) → No alert
Reading 2: AQI=100 (Moderate)  → Info alert ✅ (significant improvement)
```

---

## 📈 Monitoring & Maintenance

### Key Metrics to Track

```
Alerts Generated Per Day
├─ DANGER alerts (should be rare)
├─ WARNING alerts (expected 5-15/day per device)
└─ INFO alerts (improvement notifications)

Alert Suppression Rate
├─ % suppressed (target: 20-30%)
└─ Indicates noise vs. legitimate changes

Average Time Lag (Sensor → Alert)
├─ Should be <5 seconds
└─ Indicates performance of alert pipeline
```

### Logs to Monitor

```
[ALERT] Created warning alert for Kitchen_Monitor 
[ALERT] Suppressed danger alert for Kitchen_Monitor
[ALERT] Alert processing failed: [error details]
```

### Database Maintenance

```sql
-- Check alert distribution
SELECT alert_type, COUNT(*) as count FROM airquality_alert 
GROUP BY alert_type;

-- Check oldest unread alerts
SELECT * FROM airquality_alert 
WHERE read=FALSE 
ORDER BY timestamp DESC 
LIMIT 10;

-- Cleanup statistics
SELECT COUNT(*) as read_alerts_over_30_days 
FROM airquality_alert 
WHERE read=TRUE 
AND timestamp < DATE('now', '-30 days');
```

---

## 🔮 Future Enhancements

1. **Push Notifications** — Alert users even when app is backgrounded
2. **Smart Thresholds** — User-configurable alert sensitivity per device
3. **Historical Analytics** — "Your air quality improved 40% this month"
4. **Email Alerts** — Daily digest of critical alerts
5. **Automation** — Auto-turn-on air purifier on danger alert
6. **Trend Prediction** — "Air quality will worsen in 2 hours based on current trend"
7. **Location-Based Alerts** — Compare device AQI with nearby weather stations

---

## 📚 References

- **EPA AQI Scale**: https://www.epa.gov/air-quality/air-quality-index-aqi
- **React Native Best Practices**: https://reactnative.dev/docs/native-modules
- **Django Signals for Real-Time**: https://docs.djangoproject.com/en/4.2/topics/signals/

---

**Questions?** Refer to inline code comments or check logs in:
- Backend: `docker logs air-quality-api | grep ALERT`
- Frontend: React DevTools Debugger

