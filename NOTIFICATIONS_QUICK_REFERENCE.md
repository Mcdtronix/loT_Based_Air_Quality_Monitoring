# Real-Time Notifications — Quick Integration Guide
**5-Minute Setup** | Everything you need to enable notifications

---

## ✅ What's Implemented

Your Air Quality Monitor now has **professional-grade real-time notifications**:

| Feature | Status | Notes |
|---------|--------|-------|
| 🚨 Critical Alerts | ✅ | AQI >200 or rapid degradation |
| ⚠️ Warning Alerts | ✅ | AQI 100-200 or moderate change |
| ℹ️ Info Alerts | ✅ | Air quality improved |
| 📱 Toast Notifications | ✅ | In-app popups with haptics/sound |
| 🔔 Badge Counter | ✅ | Shows unread count on alerts tab |
| 📳 Haptic Feedback | ✅ | Vibration patterns |
| 🔊 Sound Alerts | ✅ | Critical alert sounds |
| ⚙️ User Preferences | ✅ | Disable notification types |
| 🚀 Auto-Polling | ✅ | Checks for alerts every 5 seconds |

---

## 🎯 How It Works

### User Flow

```
1. Sensor sends reading → Backend AQI calculation
2. Alert detected → Database stores alert
3. Frontend polls (every 5s) → Fetches new alerts
4. useAlertNotifications detects NEW alert → Triggers notification
5. NotificationService queues → Toast appears on screen
6. Haptics + Sound → User feels AND hears alert
7. Badge updates → Shows unread count
```

### Timeline

```
T+0s   : Sensor reading arrives at backend
T+1s   : Alert generated and saved
T+1-5s : Next polling cycle detects alert
T+6s   : Toast notification appears on screen 🚨
```

---

## 📦 Files Modified/Created

### ✨ New Files

```typescript
// Notification engine
services/notification.service.ts

// Toast renderer
components/Toast.tsx

// Alert detection
hooks/useAlertNotifications.ts

// Preference management
hooks/useNotificationPreferences.ts
```

### 📝 Updated Files

```typescript
// Added NotificationService init + Toast component
app/_layout.tsx

// Added useAlertNotifications hook call
context/DeviceContext.tsx
```

---

## 🚀 Deployment Steps

### 1️⃣ Backend (No Changes Needed)

Alert generation is already built into `views.py`. Just ensure `alert_service.py` is deployed:

```bash
# Already done if you deployed from previous guide
# Just verify AlertService.process_reading() is in views.py upload()
```

### 2️⃣ Frontend (Just Install & Deploy)

```bash
# Install expo-av for sound support
npm install expo-av

# Your files are ready:
✅ services/notification.service.ts
✅ components/Toast.tsx
✅ hooks/useAlertNotifications.ts
✅ hooks/useNotificationPreferences.ts
✅ app/_layout.tsx (updated)
✅ context/DeviceContext.tsx (updated)

# Build and deploy
eas build -p ios/android
eas submit
```

---

## 🧪 Quick Test

### Manual Trigger (Backend)

```bash
# Terminal 1: Trigger alert
curl -X POST http://localhost:8000/api/readings/upload/ \
  -H "Content-Type: application/json" \
  -d '{
    "device_name": "Test_Device",
    "temperature": 22.5,
    "humidity": 45,
    "co2": 400,
    "pm25": 250,
    "pm10": 350,
    "carbon_monoxide": 0.5,
    "nitrogen_oxide": 0.1,
    "dust": 50
  }'
```

### Verify Frontend

```javascript
// In React DevTools Console
import NotificationService from '@/services/notification.service';

// Test critical alert
NotificationService.critical(
  'Test Alert',
  'This is a test critical alert'
);

// Test warning
NotificationService.warning(
  'Test Warning',
  'This is a test warning'
);
```

---

## 📊 Real-Time Alert Flow

```
┌─────────────────────────────────────────────────────────┐
│ Backend                                                   │
│ ─────────────────────────────────────────────────────   │
│                                                          │
│   Reading Upload                                         │
│   ├─ Compute AQI ✓                                       │
│   ├─ Compare with previous ✓                             │
│   ├─ AlertService.process_reading() ← NEW           │
│   │   ├─ Check suppression rules                        │
│   │   ├─ Generate alert message                         │
│   │   └─ Save to database                               │
│   └─ Return 201 Created                                  │
│                                                          │
└─────────────────────────────────────────────────────────┘
          ↓ (HTTP)
┌─────────────────────────────────────────────────────────┐
│ Frontend                                                  │
│ ─────────────────────────────────────────────────────   │
│                                                          │
│   Alert Polling (every 5 seconds)                        │
│   ├─ fetch API /alerts/                                 │
│   └─ Update alerts array                                 │
│                                                          │
│   useAlertNotifications Hook ← NEW                      │
│   ├─ Detect NEW alerts (compare with previous state)    │
│   ├─ Route by type (danger→critical, warning→warning)   │
│   └─ Trigger NotificationService                        │
│                                                          │
│   NotificationService ← NEW                             │
│   ├─ Queue notification                                 │
│   ├─ Apply haptics (vibration pattern)                  │
│   └─ Play sound (critical alerts only)                  │
│                                                          │
│   Toast Component ← NEW                                 │
│   ├─ Render on screen                                   │
│   ├─ Animate in from top                                │
│   ├─ Auto-dismiss or wait for user tap                  │
│   └─ Haptic feedback on dismiss                         │
│                                                          │
│   Alert Tab                                              │
│   └─ Badge updates: count of unread                      │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 🎨 Notification Types & Visuals

### 🚨 Critical Alert (Danger)

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 🚨 Critical Air Quality Alert                      X ┃
┃                                                    ┃
┃ Rapid degradation: Good → Unhealthy               ┃
┃ (AQI: 45 → 215)                                   ┃
┃                                                    ┃
┃                              [View]                 ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```
- **Color**: Red (#ef4444)
- **Duration**: Stays until tapped
- **Haptics**: 3x heavy vibration pulse ⚡⚡⚡
- **Sound**: Alert siren 🔊
- **Action**: "View" button takes to Alerts tab

### ⚠️ Warning Alert

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ ⚠️ Air Quality Warning                            X ┃
┃                                                    ┃
┃ Air quality worsened: Moderate → Unhealthy       ┃
┃ (AQI: 95 → 165)                                   ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```
- **Color**: Orange (#f97316)
- **Duration**: 3.5 seconds
- **Haptics**: Medium vibration 📳
- **Sound**: Warning beep
- **Auto-dismisses** or tap ×

### ℹ️ Info Alert

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ ℹ️ Air Quality Update                             X ┃
┃                                                    ┃
┃ Air quality improved: Unhealthy → Moderate       ┃
┃ (AQI: 200 → 85)                                   ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```
- **Color**: Blue (#3b82f6)
- **Duration**: 2.5 seconds
- **Haptics**: None
- **Sound**: None
- **Auto-dismisses**

---

## ⚙️ Configuration

### Enable/Disable Notification Types

```typescript
// In DeviceProvider or your screen
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';

const { preferences, updatePreference } = useNotificationPreferences();

// Disable critical alerts
await updatePreference('enableCriticalAlerts', false);

// Disable all sound
await updatePreference('enableSound', false);
```

### Manual Notification Example

```typescript
import NotificationService from '@/services/notification.service';

// Show critical alert
NotificationService.critical(
  '🚨 Air Quality Critical',
  'AQI exceeded 300 - Take shelter indoors'
);

// Show warning
NotificationService.warning(
  'Air Quality Declining',
  'Current AQI: 150 - Sensitive groups should limit activity'
);

// Custom with action
const id = NotificationService.show({
  type: 'danger',
  title: 'Emergency Alert',
  message: 'Immediate action required',
  duration: 0, // Indefinite
  haptics: true,
  sound: true,
  action: {
    label: 'Call 911',
    onPress: () => {
      // Handle action
    },
  },
});
```

---

## 🔍 Debugging Checklist

If notifications aren't appearing:

1. **Backend Alert Generated?**
   ```bash
   curl http://localhost:8000/api/alerts/
   # Should show recent alerts with type: "danger"|"warning"|"info"
   ```

2. **Frontend Fetching Alerts?**
   ```javascript
   // Check DeviceContext
   const { alerts } = useDevice();
   console.log('Alerts:', alerts);
   ```

3. **Notifications Enabled?**
   ```javascript
   const { preferences } = useNotificationPreferences();
   console.log('Notifications enabled:', preferences);
   ```

4. **Toast Component Mounted?**
   ```javascript
   // Should see <Toast /> in root _layout.tsx
   ```

5. **Haptics/Sound Working?**
   ```javascript
   import { HapticPatterns } from '@/services/notification.service';
   await HapticPatterns.Heavy(); // Test vibration
   ```

---

## 📚 Full Documentation

For detailed information:
- Backend Alerts: See `ALERT_SYSTEM_DOCUMENTATION.md`
- Notifications: See `NOTIFICATION_SYSTEM_DOCUMENTATION.md`

---

## ✨ What Users See

### User Scenario

```
1. Air quality reading arrives (AQI 45)
   → User sees nothing (good air)

2. New reading arrives (AQI 215)
   → Screen vibrates 📳
   → Alert sound plays 🔊
   → Red toast pops down from top 🚨
   → "Critical Air Quality Alert"
   → Badge on Alerts tab shows "1" 🔔
   →User taps → Goes to Alerts tab → Sees full message

3. 10 minutes later, air clears (AQI 75)
   → Blue info toast appears
   → "Air quality improved"
   → User dismisses
```

---

## 🎉 You're All Set!

Your application now provides:
✅ **Real-time alert notifications**
✅ **Critical situation awareness**
✅ **Professional user experience**
✅ **Persistent alert history**
✅ **Customizable preferences**

**Next Steps**:
1. Add sound files to `assets/sounds/` (optional but recommended)
2. Test with real sensor data
3. Gather user feedback on notification frequency
4. Consider adding push notifications for backgrounded apps
5. Monitor alert metrics in production

---

**Questions?** See inline code comments in:
- `notification.service.ts` — Notification engine
- `Toast.tsx` — UI component
- `useAlertNotifications.ts` — Alert detection logic

