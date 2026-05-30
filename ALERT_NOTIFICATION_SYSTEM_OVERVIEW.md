# Alert & Notification System - Complete Overview

## 🎯 System Architecture

The Air Quality Monitor uses a **3-layer alert and notification system**:

```
LAYER 1: BACKEND (Alert Generation) 
    ↓
LAYER 2: FRONTEND (Real-Time Polling)
    ↓  
LAYER 3: USER NOTIFICATIONS (Toast + Haptics + Sound)
```

---

## 📊 LAYER 1: Backend Alert System

### Location
- **Alert Service**: `Backend/airquality/alert_service.py`
- **Views Integration**: `Backend/airquality/views.py`
- **Database Model**: `Backend/airquality/models.py`

### Components

#### A. Alert Service (`AlertService`)
**File**: `alert_service.py`

| Component | Purpose |
|-----------|---------|
| `AlertService.process_reading()` | Main entry point - analyzes sensor readings |
| `should_alert_on_trend_change()` | Detects if AQI change warrants alert |
| `should_suppress_alert()` | Prevents spam (30-min suppression window) |
| `create_alert()` | Persists alert to database |
| `get_aqi_level()` | Maps AQI value to level (Good/Moderate/Unhealthy) |

#### B. Alert Thresholds (`AQIThreshold`)
```
Good               (0-50)      🟢 No alert
Moderate          (51-100)    🟡 No alert
USG*           (101-150)    🟠 WARNING alert
Unhealthy      (151-200)    🔴 WARNING alert
Very Unhealthy (201-300)    🔴🔴 DANGER alert
Hazardous        (>300)     🔴🔴🔴 DANGER alert

*Unhealthy for Sensitive Groups
```

### Alert Generation Logic

```python
# When sensor reading arrives:
1. Get current AQI from sensor
2. Fetch previous reading (if exists)
3. Compare trend:
   - Same level → No alert ❌
   - Better by 40+ → INFO alert ℹ️
   - Worse (normal) → WARNING ⚠️
   - Worse by 30+ → DANGER 🚨
4. Check suppression:
   - Same type within 30 min → Suppress ⏸️
   - Different type → Always trigger ✅
   - First reading with AQI ≥150 → Always trigger ✅
5. Create and save alert
```

### Example: First Reading Alert Triggers

```
Reading 1: AQI = 13 (Good)  → No alert (AQI < 150)
Reading 2: AQI = 250 (Hazardous) → ✅ DANGER alert created!
   Message: "Initial reading: Hazardous (AQI: 13 → 250, Level: Hazardous)"
```

### Database Schema

```sql
Alert Table:
├── id (INTEGER) - Unique identifier
├── device_id (FK) - Which device
├── timestamp (DATETIME) - When alert triggered
├── alert_type VARCHAR(10) - 'warning' | 'danger' | 'info'
├── message (TEXT) - Alert description
├── aqi (INTEGER) - AQI at trigger time
└── read (BOOLEAN) - User acknowledged?
```

---

## 📱 LAYER 2: Frontend Real-Time System

### Location
- **Alert Service**: `Frontend/services/alert.service.ts`
- **Device Context**: `Frontend/context/DeviceContext.tsx`
- **Alert Hook**: `Frontend/hooks/useAlertNotifications.ts`

### Components

#### A. Real-Time Polling (`DeviceContext`)
**Polling Interval**: 5 seconds

```typescript
// In DeviceContext.tsx:
useEffect(() => {
  // Poll every 5 seconds
  const pollInterval = setInterval(async () => {
    if (alertPollInFlight) return;  // Prevent duplicates
    
    alertPollInFlight = true;
    try {
      await loadAlerts();  // Fetch from backend
      
      if (failures >= 3) {
        // Exponential backoff: wait 30 seconds
        alertPollBackoffUntil = now + 30000;
      }
    } catch (error) {
      failures++;
    } finally {
      alertPollInFlight = false;
    }
  }, ALERT_POLL_INTERVAL_MS);
  
  return () => clearInterval(pollInterval);
}, []);
```

#### B. Alert Service Utilities (`alert.service.ts`)

| Function | Purpose |
|----------|---------|
| `calculateAlertStats()` | Count unread/critical alerts |
| `filterAlerts()` | Filter by type, read status, time range |
| `sortAlerts()` | Smart sort: unread danger → warning → read |
| `groupAlertsByDevice()` | Group alerts by source device |
| `formatAlertTime()` | Convert timestamp to "5m ago" format |
| `getAlertAction()` | Get recommendation for alert type |

#### C. Detection & Deduplication Hook (`useAlertNotifications`)

**How it works:**

```typescript
export const useAlertNotifications = (alerts, config) => {
  // Track previous alerts
  const previousAlertsRef = useRef([]);
  
  // Track already-notified alerts (prevent duplicates)
  const notifiedAlertIdsRef = useRef(new Set());
  
  useEffect(() => {
    // Find NEW alerts by comparing previous vs current
    const newAlerts = alerts.filter(
      alert => !previousAlertIdsRef.includes(alert.id)
    );
    
    // Process each new alert
    newAlerts.forEach(alert => {
      // Skip if already notified
      if (notifiedAlertIdsRef.has(alert.id)) return;
      
      // Mark as notified
      notifiedAlertIdsRef.add(alert.id);
      
      // Route by type
      if (alert.type === 'danger') handleCriticalAlert(alert);
      else if (alert.type === 'warning') handleWarningAlert(alert);
      else if (alert.type === 'info') handleInfoAlert(alert);
    });
    
    // Update previous for next comparison
    previousAlertsRef.current = alerts;
  }, [alerts]);
};
```

---

## 🔔 LAYER 3: Notification UI System

### Location
- **Notification Service**: `Frontend/services/notification.service.ts`
- **Toast Component**: `Frontend/components/Toast.tsx`
- **Preferences Hook**: `Frontend/hooks/useNotificationPreferences.ts`
- **Alert Screen**: `Frontend/app/(tabs)/alerts.tsx`

### Components

#### A. Notification Service (`NotificationService`)

**Queue-Based System**:
```
Input → Queue → Processing → Display → Auto-dismiss/Manual close
```

**Methods:**
```typescript
// Core
NotificationService.show(config)        // Generic show
NotificationService.initialize()        // Init audio system

// Shortcuts
NotificationService.critical(title, msg, action?)
NotificationService.warning(title, msg)
NotificationService.info(title, msg)
NotificationService.error(title, msg)
NotificationService.success(title, msg)

// Manage
NotificationService.dismiss(id)         // Remove specific
NotificationService.dismissAll()        // Clear all
NotificationService.subscribe(callback) // Listen for updates
```

#### B. Toast Configuration

| Type | Duration | Haptics | Sound | Auto-Dismiss |
|------|----------|---------|-------|-------------|
| **critical** | ∞ | Heavy 3x | Siren | Manual only |
| **error** | 4s | Error pattern | None | Yes |
| **warning** | 3.5s | Light | Beep | Yes |
| **info** | 2.5s | None | None | Yes |
| **success** | 2.5s | None | None | Yes |

#### C. Toast UI Component (`Toast.tsx`)

**Features:**
```typescript
export const Toast = () => {
  // Subscribe to notification service
  useEffect(() => {
    const unsubscribe = NotificationService.subscribe(notify => {
      setNotification(notify);
    });
    return unsubscribe;
  }, []);
  
  // Animate in from top
  useEffect(() => {
    if (notification) {
      Animated.parallel([
        // Slide from -height to (top + 8)
        Animated.timing(slideAnim, {
          toValue: insets.top + 8,
          duration: 300,
          useNativeDriver: true,
        }),
        // Fade in
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [notification]);
  
  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      {/* Toast UI with colors based on type */}
      {notification && (
        <View style={getColorStyle(notification.type)}>
          <Icon name={getIconName(notification.type)} />
          <Text>{notification.title}</Text>
          <Text>{notification.message}</Text>
          {notification.action && (
            <TouchableOpacity onPress={notification.action.onPress}>
              <Text>{notification.action.label}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </Animated.View>
  );
};
```

#### D. Haptic Feedback System

```typescript
HapticPatterns = {
  Light:     () => Haptics.impactAsync(Light),
  Medium:    () => Haptics.impactAsync(Medium),
  Heavy:     () => Haptics.impactAsync(Heavy),
  Success:   () => Haptics.notificationAsync(Success),
  Warning:   () => Haptics.notificationAsync(Warning),
  Error:     () => Haptics.notificationAsync(Error),
  Critical:  () => Heavy + wait + Heavy + wait + Heavy,  // 3x pulse
  Selection: () => Haptics.selectionAsync(),
};
```

#### E. Sound Alert System (`AlertSoundManager`)

```typescript
class AlertSoundManager {
  static async initialize() {
    // Setup audio mode (iOS/Android compatible)
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
  }
  
  static async playWarningSound() {
    // Load & play: assets/sounds/warning.mp3
  }
  
  static async playCriticalSound() {
    // Load & play: assets/sounds/critical-alert.mp3 (max volume)
  }
  
  static async stopAll() {
    // Stop all playing sounds
  }
}
```

#### F. Notification Preferences (`useNotificationPreferences`)

```typescript
interface NotificationPreferences {
  enableCriticalAlerts: boolean;
  enableWarningAlerts: boolean;
  enableInfoAlerts: boolean;
  enableSound: boolean;
  enableHaptics: boolean;
  enablePushNotifications: boolean;
}

// Persisted to AsyncStorage: @aqm_notification_preferences
// Allows users to enable/disable notification types
```

#### G. Alerts Screen (`alerts.tsx`)

**Features:**
- 📊 Statistics (unread, critical, total counts)
- 🔍 Smart filtering (Unread | Critical | All)
- 📋 Sorted list (unread danger → unread warning → read)
- 💬 Action recommendations for each alert
- ✅ Mark as read functionality
- 🔔 Badge counter on tab

---

## 🔄 Complete Process Flow

### Timeline: Sensor to Notification

```
T+0s   : ESP32 sensor detects AQI change
         ↓
T+1s   : Device sends POST /api/readings/upload/
         ↓
T+1s   : Backend receives reading
         ├─ Save SensorReading to DB
         ├─ Call AlertService.process_reading()
         │   ├─ Get previous reading
         │   ├─ Analyze trend
         │   ├─ Check thresholds
         │   └─ Create Alert if conditions met
         └─ Return 201 response
         ↓
T+2-5s : Frontend polls (every 5s interval)
         ├─ GET /api/alerts/
         ├─ Receive new alerts array
         └─ Update DeviceContext.alerts state
         ↓
T+6s   : useAlertNotifications hook detects new alert
         ├─ Compare previous vs current alerts
         ├─ Find newAlerts (not in previous)
         ├─ Check if already notified
         └─ Route to handler:
            ├─ danger   → handleCriticalAlert()
            ├─ warning  → handleWarningAlert()
            └─ info     → handleInfoAlert()
         ↓
T+6s   : Handler calls NotificationService
         ├─ critical() for danger
         ├─ warning() for warning
         └─ info() for info
         ↓
T+6s   : NotificationService processes
         ├─ Add to queue
         ├─ Apply haptics (if enabled)
         ├─ Play sound (if enabled)
         ├─ Show toast on screen
         ├─ Notify subscribers
         └─ Schedule auto-dismiss
         ↓
T+6s   : User sees & feels notification
         ├─ Toast slides in from top
         ├─ Haptics trigger
         ├─ Sound plays
         └─ Alert also appears in Alerts tab
         ↓
T+6s-10s: User can tap to view
         ├─ Dismiss notification manually
         └─ Mark alert as read
         ↓
T+4000ms: Auto-dismiss (error alerts)
T+3500ms: Auto-dismiss (warning alerts)
T+2500ms: Auto-dismiss (info/success alerts)
∞      : Critical alerts stay until dismissed
```

### Data Flow Diagram

```
┌─────────────────────────────┐
│   ESP32 Sensor Device       │
│   (AQI Reading)             │
└──────────────┬──────────────┘
               │ POST /api/readings/upload/
               ▼
┌─────────────────────────────┐
│   Backend API               │
│  (Django REST Framework)    │
└──────────────┬──────────────┘
               │ SensorReading.save()
               ▼
┌─────────────────────────────┐
│   Alert Service             │
│  (Trend Analysis)           │
└──────────────┬──────────────┘
               │ AlertService.process_reading()
               ├─ Compare AQI trends
               ├─ Check thresholds
               └─ Check suppression
               │
               ▼
       Alert.objects.create()
               │
               ▼
┌─────────────────────────────┐
│   Database                  │
│  (Alert Model)              │
└──────────────┬──────────────┘
               │ Every 5 seconds
               │ GET /api/alerts/
               ▼
┌─────────────────────────────┐
│   Frontend App              │
│  (React Native/Expo)        │
└──────────────┬──────────────┘
               │ DeviceContext.loadAlerts()
               ├─ Store in alerts state
               │
               ▼ useAlertNotifications()
       ┌───────┴────────┐
       │                │
    NEW?           Already notified?
       │ Yes            │ Yes
       ▼                └──→ Skip
   Add to                    
   notified set        
       │              
       ├─ danger ──→ handleCriticalAlert()
       ├─ warning ─→ handleWarningAlert()
       └─ info ────→ handleInfoAlert()
               │
               ▼
┌─────────────────────────────┐
│   NotificationService       │
│  (Queue + Process)          │
└──────────────┬──────────────┘
               │
      ┌────────┼────────┐
      │        │        │
      ▼        ▼        ▼
   Haptics   Sound    Show Toast
      │        │        │
      └────────┼────────┘
               │
               ▼
┌─────────────────────────────┐
│   User                      │
│  Sees notification!         │
│  Feels vibration (haptics)  │
│  Hears sound                │
└─────────────────────────────┘
```

---

## 📝 Alert Types & Routing

### Critical Alert (DANGER)
```
Trigger:     AQI > 200 OR rapid increase of 30+ points
Visual:      🚨 Red toast with alert icon
Haptics:     Heavy triple pulse (⚡ ⚡ ⚡)
Sound:       Critical siren (max volume)
Duration:    Persistent (manual dismiss only)
Action:      "View" button → Opens alerts tab
Example:     "🚨 Critical Alert: Rapid degradation: Good → Unhealthy"
```

### Warning Alert (WARNING)
```
Trigger:     AQI 100-200 OR moderate increase
Visual:      ⚠️ Orange toast with warning icon
Haptics:     Light vibration
Sound:       Beep tone
Duration:    3.5 seconds, auto-dismiss
Action:      Auto-dismiss, can tap to view
Example:     "⚠️ Air Quality Warning: Worsened: Moderate → Unhealthy"
```

### Info Alert (INFO)
```
Trigger:     AQI improved by 40+ points (positive change!)
Visual:      ℹ️ Blue toast with info icon
Haptics:     None
Sound:       None
Duration:    2.5 seconds, auto-dismiss
Action:      Auto-dismiss
Example:     "ℹ️ Air Quality Update: Improved: Unhealthy → Moderate"
```

---

## 🔍 Key Features

### 1. Smart Deduplication
- **Backend**: 30-minute alert suppression per type
- **Frontend**: Track notified alert IDs, skip duplicates

### 2. Exponential Backoff
- Polling fails 1-2 times: continue every 5s
- Polling fails 3+ times: back off to 30s
- Recovers automatically when successful

### 3. Non-Blocking
- Alert failures don't crash API
- Notification failures don't crash app
- Graceful error handling throughout

### 4. User Control
- Preferences hook toggles notification types
- AsyncStorage persistence
- Can disable haptics/sound individually

### 5. Real-Time Awareness
- 5-second polling for latest alerts
- Immediate notification on detection
- ~6 second latency from sensor to user notification

---

## 📂 Project Structure

```
Backend/
├── alert_service.py           ← Alert generation engine
├── views.py                   ← API endpoint + AlertService call
├── models.py                  ← Alert & SensorReading models
└── serializers.py             ← Alert serialization

Frontend/
├── services/
│   ├── notification.service.ts    ← Notification engine + queue
│   └── alert.service.ts           ← Filtering, sorting, stats
├── components/
│   ├── Toast.tsx                  ← Toast UI component
│   └── *other components*
├── hooks/
│   ├── useAlertNotifications.ts   ← Detection & routing
│   └── useNotificationPreferences.ts
├── context/
│   └── DeviceContext.tsx          ← Polling + state
└── app/(tabs)/
    └── alerts.tsx                 ← Alerts screen UI
```

---

## ⚙️ Configuration Constants

### Backend
```python
ALERT_SUPPRESSION_MINUTES = 30      # Don't repeat same alert type
ALERT_CLEANUP_DAYS = 30             # Keep alerts 30 days
```

### Frontend
```typescript
ALERT_POLL_INTERVAL_MS = 5000       // Poll every 5 seconds
ALERT_POLL_BACKOFF_MS = 30000       // Back off 30s on failure
TOAST_HEIGHT = 100                  // Toast component height
ANIMATION_DURATION = 300            // Slide/fade animation duration
```

---

## 🚀 Deployment Checklist

- ✅ Backend: Alert service integrated in views.py
- ✅ Frontend: expo-av installed for sound
- ✅ Database: Alert model created
- ✅ API: /api/alerts/ endpoint ready
- ✅ Audio: Assets placed in /assets/sounds/
- ✅ Preferences: AsyncStorage configured

---

## 📊 Monitoring & Debugging

### Check Backend Alerts Created
```bash
sqlite3 db.sqlite3 "SELECT count(*) FROM airquality_alert;"
```

### View Recent Alerts
```bash
sqlite3 db.sqlite3 "SELECT timestamp, alert_type, message FROM airquality_alert ORDER BY timestamp DESC LIMIT 10;"
```

### Watch Frontend Logs
```
[AlertNotification] Critical alert: ...
[NotificationService] Showing toast...
[AlertSoundManager] Playing sound...
```

### Test Alert Creation
```bash
python manage.py shell
from airquality.alert_service import AlertService
from airquality.models import SensorReading
reading = SensorReading.objects.latest('timestamp')
alert = AlertService.process_reading(reading)
print(alert)  # Should show created alert
```

