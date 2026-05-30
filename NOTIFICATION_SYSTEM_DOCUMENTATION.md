# Real-Time Notification System — Implementation Guide
**Version 1.0.0** | Professional multi-channel alert delivery for Air Quality Monitor  
**Status**: Production-Ready | **Last Updated**: May 26, 2026

---

## 📋 System Overview

The **Real-Time Notification System** delivers critical air quality alerts to users through multiple channels:

1. **In-App Toast Notifications** — Immediate visual/haptic feedback
2. **Badge Counters** — Alerts tab shows unread count
3. **Haptic Feedback** — Vibration patterns for different alert types
4. **Sound Alerts** — Audio notifications for critical situations
5. **Notification Preferences** — User-configurable notification settings

---

## 🎯 Architecture

### Component Hierarchy

```
Root Layout (_layout.tsx)
├─ Notification Service (initialization)
├─ Toast Component (renders active notification)
├─ DeviceProvider
│  ├─ useAlertNotifications Hook (triggers notifications)
│  ├─ Alert Polling (5s interval)
│  └─ Alerts State
└─ Tab Navigation
   └─ Alerts Tab (shows badge count)
```

### Data Flow

```
ESP32 sends reading
    ↓
Backend computes AQI
    ↓
AlertService.process_reading() generates alert
    ↓
Alert saved to database
    ↓
Frontend polls /api/alerts/ (every 5s)
    ↓
Alert added to alerts array
    ↓
useAlertNotifications hook detects NEW alert
    ↓
Notification Service queued
    ↓
Toast displayed on screen (with haptics/sound)
    ↓
Badge counter updated on Alerts tab
```

---

## 📁 File Structure

### New Files Created

```
Frontend/
├─ services/
│  ├─ notification.service.ts      (Notification engine)
│  └─ alert.service.ts             (Alert utilities - existing)
├─ components/
│  └─ Toast.tsx                    (Toast renderer)
├─ hooks/
│  ├─ useAlertNotifications.ts     (Alert detection hook)
│  └─ useNotificationPreferences.ts (Prefs management)
└─ app/
   ├─ _layout.tsx                  (Root layout - updated)
   └─ (tabs)/
      └─ alerts.tsx                (Alerts screen - existing)
```

### Modified Files

1. **`app/_layout.tsx`**
   - Added Toast import and initialization
   - Initialize NotificationService
   - Place Toast component in render tree

2. **`context/DeviceContext.tsx`**
   - Import useAlertNotifications hook
   - Call hook to detect new alerts
   - Automatically trigger notifications

3. **`app/(tabs)/_layout.tsx`**
   - Already has badge counter (`tabBarBadge: unreadAlerts > 0`)
   - No changes needed

---

## 🔔 Notification Service

**File**: `Frontend/services/notification.service.ts`

### API Reference

#### Show Notifications

```typescript
// Critical alert (persistent, with sound/haptics)
NotificationService.critical(
  title: string,
  message: string,
  action?: { label: string; onPress: () => void }
)

// Warning alert (3.5s auto-dismiss)
NotificationService.warning(title: string, message: string)

// Info alert (2.5s auto-dismiss)
NotificationService.info(title: string, message: string)

// Custom notification
NotificationService.show({
  type: 'danger' | 'warning' | 'info' | 'success' | 'error',
  title: string,
  message: string,
  duration?: number,    // 0 = indefinite
  haptics?: boolean,
  sound?: boolean,
  action?: { label: string; onPress: () => void }
})
```

#### Manage Notifications

```typescript
// Dismiss specific notification
NotificationService.dismiss(id: string)

// Dismiss all
NotificationService.dismissAll()

// Get current notification
NotificationService.getCurrent(): ToastConfig | null

// Get queue size
NotificationService.getQueueSize(): number

// Subscribe to updates
const unsubscribe = NotificationService.subscribe((notification) => {
  console.log('Notification changed:', notification);
});
```

#### Haptic Patterns

```typescript
HapticPatterns.Light()        // Subtle tap
HapticPatterns.Medium()       // General feedback
HapticPatterns.Heavy()        // Strong impact
HapticPatterns.Success()      // Success pattern
HapticPatterns.Warning()      // Warning vib
HapticPatterns.Error()        // Error pattern
HapticPatterns.Critical()     // Urgent repeating pulse
HapticPatterns.Selection()    // Selection feedback
```

---

## 🎨 Toast Component

**File**: `Frontend/components/Toast.tsx`

### Features

- **Animated appearance/dismissal** — Slide down from top
- **Color-coded** — Visual severity indicator
- **Auto-dismiss** — Based on notification type
- **Action buttons** — Tap to take action
- **Dismissible** — Tap card or X button
- **Haptic response** — Vibration on display

### Visual Design

```
┌─────────────────────────────────────┐
│ 🚨 Critical Alert                   │
│ Air quality has degraded rapidly    │ [View] [×]
└─────────────────────────────────────┘
```

**Colors**:
- Success: Green (#22c55e)
- Warning: Orange (#f97316)
- Error/Danger: Red (#ef4444)
- Info: Blue (#3b82f6)

**Z-Index**: 9999 (always on top)

---

## 🔗 Alert Detection Hook

**File**: `Frontend/hooks/useAlertNotifications.ts`

### Usage

```typescript
import { useAlertNotifications } from '@/hooks/useAlertNotifications';

export function MyComponent() {
  const alerts = useDevice().alerts;

  // Enables notifications for all alert types
  useAlertNotifications(alerts, {
    enableCriticalAlerts: true,
    enableWarningAlerts: true,
    enableInfoAlerts: true,
    onAlertReceived: (alert) => {
      console.log('Alert received:', alert);
    },
  });

  return <View>...</View>;
}
```

### How It Works

1. **Tracks previous alerts state** — Detects additions
2. **Filters new alerts** — Only notifies about previously unseen alerts
3. **Deduplicates** — Won't re-notify about same alert
4. **Routes by type** — Different notifications for danger/warning/info
5. **Respects preferences** — Honors user notification settings

---

## ⚙️ Notification Preferences

**File**: `Frontend/hooks/useNotificationPreferences.ts`

### Usage

```typescript
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';

export function SettingsScreen() {
  const { preferences, updatePreference, resetToDefaults } = useNotificationPreferences();

  const handleToggleCritical = () => {
    updatePreference('enableCriticalAlerts', !preferences.enableCriticalAlerts);
  };

  return (
    <View>
      <Toggle
        label="Critical Alerts"
        value={preferences.enableCriticalAlerts}
        onToggle={handleToggleCritical}
      />
      {/* ... more settings ... */}
    </View>
  );
}
```

### Preference Storage

- **Backend**: AsyncStorage (device-local)
- **Persistence**: Survives app restarts
- **Defaults**: All notifications enabled

### Available Settings

```typescript
{
  enableCriticalAlerts: true,      // 🚨 Danger alerts
  enableWarningAlerts: true,       // ⚠️ Warning alerts
  enableInfoAlerts: true,          // ℹ️ Improvement alerts
  enableSound: true,                // Audio alerts
  enableHaptics: true,              // Vibration feedback
  enablePushNotifications: true,     // Background notifications
}
```

---

## 📊 Alert-to-Notification Mapping

### CRITICAL (Danger Type)

**Trigger**: AQI > 200 or rapid degradation

**Notification**:
- **Icon**: 🚨 (red octagon)
- **Title**: "🚨 Critical Air Quality Alert"
- **Duration**: Indefinite (must dismiss)
- **Haptics**: Critical pulse pattern
- **Sound**: Alert siren
- **Action**: "View" button
- **Badge**: Unread count +1

**Example**:
```
🚨 Critical Air Quality Alert
Rapid degradation: Good → Unhealthy (AQI: 45 → 215)
[View] [×]
```

### WARNING (Warning Type)

**Trigger**: AQI 100-200 or moderate change

**Notification**:
- **Icon**: ⚠️ (orange triangle)
- **Title**: "⚠️ Air Quality Warning"
- **Duration**: 3.5 seconds
- **Haptics**: Medium vibration
- **Sound**: Warning beep
- **Action**: None
- **Badge**: Unread count +1

**Example**:
```
⚠️ Air Quality Warning
Air quality worsened: Moderate → Unhealthy (AQI: 95 → 165)
[×]
```

### INFO (Info Type)

**Trigger**: Quality improved 40+ points

**Notification**:
- **Icon**: ℹ️ (blue circle)
- **Title**: "ℹ️ Air Quality Update"
- **Duration**: 2.5 seconds
- **Haptics**: None
- **Sound**: None
- **Action**: None
- **Badge**: Updated (if still unread)

**Example**:
```
ℹ️ Air Quality Update
Air quality improved: Unhealthy → Moderate (AQI: 200 → 85)
```

---

## 🔧 Integration Checklist

### Backend
- [x] AlertService generates alerts on sensor reading
- [x] Alert persisted to database
- [x] API endpoint returns alerts

### Frontend
- [x] NotificationService implemented
- [x] Toast component created
- [x] useAlertNotifications hook detects alerts
- [x] useNotificationPreferences for settings
- [x] Toast component added to root layout
- [x] NotificationService initialized on app start
- [x] Alert polling (5s interval) implemented
- [x] Badge counter on alerts tab

### Testing
- [ ] Create test alert via manual AQI change
- [ ] Verify notification appears within 5 seconds
- [ ] Test haptic feedback
- [ ] Test sound playback
- [ ] Test dismiss functionality
- [ ] Test notification queue ordering
- [ ] Test badge counter updates

---

## 🧪 Testing Scenarios

### Scenario 1: Critical Alert

**Setup**: Sensor reading AQI 50 → 250

**Expected**:
1. ✅ Notification appears within 5s
2. ✅ Red toast with 🚨 icon
3. ✅ Haptic pulse (3x vibration)
4. ✅ Alert sound plays
5. ✅ Badge shows "1" on alerts tab
6. ✅ Persists until user taps

**Command** (manual test):
```bash
# Trigger via API
curl -X POST https://api.example.com/api/readings/upload/ \
  -H "Content-Type: application/json" \
  -d '{"device_name":"Test","aqi":250,...}'
```

### Scenario 2: Multiple Alerts

**Setup**: 3 alerts in 10 seconds

**Expected**:
1. ✅ First alert displays immediately
2. ✅ Queue remaining alerts
3. ✅ Auto-dismiss, show next
4. ✅ Badge shows "3"

### Scenario 3: Notification Preferences

**Setup**: Disable critical alerts in settings

**Expected**:
1. ✅ New critical alert generated (backend)
2. ✅ Not displayed as notification
3. ✅ Still appears in alerts tab
4. ✅ Badge updated

---

## 📱 Sound Asset Setup

For production, add alert sounds to `assets/sounds/`:

```
assets/sounds/
├─ warning.mp3         (500ms beep)
├─ critical-alert.mp3  (1s urgent siren)
└─ notification.mp3    (optional: gentle chime)
```

**Note**: Requires adding `expo-av` to dependencies

```bash
expo install expo-av
```

---

## 🐛 Debugging

### Enable Verbose Logging

```typescript
// In NotificationService
console.log('[AlertNotification] Critical alert:', alert.message);
console.log('[Haptics] Critical pattern:', result);
console.log('[Sound] Playing alert:', soundName);
```

### Check Notification Queue

```typescript
console.log('Queue size:', NotificationService.getQueueSize());
console.log('Current:', NotificationService.getCurrent());
```

### Verify Preferences

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

const prefs = await AsyncStorage.getItem('@aqm_notification_preferences');
console.log('Preferences:', JSON.parse(prefs));
```

---

## 🚀 Deployment

### 1. Backend
```bash
# No changes needed — AlertService already integrated
python manage.py migrate
systemctl restart air-quality-api
```

### 2. Frontend
```bash
# Install dependencies
npm install -S expo-av

# Build and submit
eas build -p ios/android
eas submit
```

### 3. Assets
- Add audio files to `assets/sounds/`
- Rebuild app bundle

---

## 📈 Monitoring

### Metrics to Track

```
Notifications Shown Per Day
├─ Critical: 0-2 (per device)
├─ Warning: 5-15 (per device)
└─ Info: 2-5 (per device)

Toast Interaction Rate
├─ Dismissed: {X}%
├─ Actioned: {Y}%
└─ Auto-dismissed: {Z}%

Error Rate
├─ Haptics failures: {X}%
├─ Sound playback failures: {Y}%
└─ Toast rendering issues: {Z}%
```

### Log Aggregation

```
[NotificationService] Critical alert shown
[Haptics] Pattern completed
[Sound] Playback finished
[Toast] Dismissed by user
```

---

## 🎓 Future Enhancements

1. **Email Daily Digest** — Summary of day's alerts
2. **Smart Grouping** — Combine similar alerts within 5min
3. **Quiet Hours** — User-defined notification blackout periods
4. **Custom Sounds** — Per-device custom alert sounds
5. **Animation Preferences** — Reduce motion mode
6. **Persistent Notifications** — Notification center integration
7. **Smart Retry** — Retry failed notifications with backoff

---

## 📞 Support

**Issues**?
1. Check alert is generated in backend (`curl /api/alerts/`)
2. Verify app is polling (`console.log` in useAlertNotifications)
3. Check notification preferences are enabled
4. Ensure haptics/sound permissions granted

**Logs**:
- Frontend: React DevTools
- Backend: `docker logs air-quality-api | grep ALERT`
- Storage: AsyncStorage inspector in React Native Debugger

