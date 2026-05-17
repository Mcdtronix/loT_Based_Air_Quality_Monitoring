# Quick Reference Guide - Phase 1 Frontend Integration

## 🎯 Key Files & Their Purposes

### API Layer
```
config/api.config.ts
  └─ API_CONFIG object with all endpoint URLs
     └─ Used by: services/api.service.ts

services/api.service.ts
  ├─ Type definitions: User, Device, SensorReading, Alert, Profile
  ├─ API modules: authApi, deviceApi, readingApi, alertApi, profileApi
  └─ Helper: apiCall() with error handling
     └─ Used by: AuthContext, DeviceContext
```

### State Management
```
context/AuthContext.tsx
  ├─ Manages: accessToken, refreshToken, user, isAuthenticated
  ├─ Methods: request2FA(), verify2FA(), refreshAccessToken(), logout()
  └─ Stores in: AsyncStorage
     └─ Used by: All screens for auth status

context/DeviceContext.tsx
  ├─ Manages: devices[], selectedDevice, readings[], alerts[]
  ├─ Methods: loadDevices(), selectDevice(), loadReadings(), createDevice()
             markAlertRead(), markAllAlertsRead()
  ├─ Helper: withTokenRefresh() for auto token refresh on 401
  └─ Used by: devices.tsx, dashboard.tsx
```

### Screens

**Authentication Flow**
```
app/auth/request-2fa.tsx (Email input)
   ↓
app/auth/verify-2fa.tsx (Code + Timer)
   ↓
/(tabs)/devices.tsx (Device list)
   ↓
/(tabs)/dashboard.tsx (Sensor data)
   ↓
app/add-device.tsx (Register new sensor)
```

## 🔐 Authentication

### Getting Tokens
```typescript
const { request2FA, verify2FA, isAuthenticated } = useAuth();

// Step 1: Request code
await request2FA(email);

// Step 2: Verify code
await verify2FA(email, code);

// Tokens now in AsyncStorage, useAuth() returns latest
```

### Using Tokens
```typescript
// Automatically included in all API calls via DeviceContext
const { accessToken } = useAuth();
// Use in API service calls (handled by withTokenRefresh)
```

### Token Refresh
```typescript
// Automatic on 401 via withTokenRefresh()
// Manual refresh if needed:
const { refreshAccessToken } = useAuth();
await refreshAccessToken();
```

## 📱 Common Usage Patterns

### Load Devices
```typescript
import { useDevice } from "@/context/DeviceContext";

export default function MyScreen() {
  const { devices, isLoading, loadDevices } = useDevice();
  
  useEffect(() => {
    loadDevices(); // Loads on mount
  }, []);
}
```

### Get Current Device Data
```typescript
const { selectedDevice, readings, alerts } = useDevice();

if (selectedDevice) {
  console.log(selectedDevice.device_name);
  console.log(readings[readings.length - 1].aqi); // Latest reading
}
```

### Create Device
```typescript
const { createDevice } = useDevice();

await createDevice({
  device_id: "AG-001",
  device_name: "Living Room"
});
```

### Manage Alerts
```typescript
const { alerts, markAlertRead, markAllAlertsRead, unreadAlertsCount } = useDevice();

// Mark single alert as read
await markAlertRead(alertId);

// Mark all as read
await markAllAlertsRead();

// Get count
console.log(`${unreadAlertsCount} unread alerts`);
```

## 🛠️ API Examples

### Get Device with Latest Reading
```typescript
const devices = await deviceApi.list(accessToken);
// Returns: { results: [{ id, device_id, device_name, status, last_reading }] }

// Device has last_reading:
// { aqi: 65, timestamp: "2024-01-15T10:30:00Z" }
```

### Get Sensor Readings
```typescript
const readings = await readingApi.list(accessToken, deviceId);
// Returns: { results: SensorReading[] }

// Fields: pm25, pm10, co2, humidity, temperature, dust_density, aqi, timestamp
```

### Create Sensor Reading
```typescript
await readingApi.create(accessToken, {
  device: deviceId,
  pm25: 15.2,
  pm10: 28.5,
  co2: 420,
  humidity: 45,
  temperature: 22.5,
  dust_density: 18.3
});
```

## 📊 UI Component Props

### ThemedText
```typescript
<ThemedText 
  style={styles.text}
  numberOfLines={1}
>
  Display text
</ThemedText>
```

### Button Pattern
```typescript
<TouchableOpacity onPress={handlePress} disabled={isLoading}>
  <ThemedText>{isLoading ? "Loading..." : "Click me"}</ThemedText>
</TouchableOpacity>
```

## 🎨 Styling Constants

```typescript
const COLORS = {
  primary: "#0369a1",      // Sky Blue
  success: "#22c55e",      // Green
  warning: "#f59e0b",      // Amber
  error: "#ef4444",        // Red
  background: "#f8fafc",   // Light Slate
  card: "#ffffff",         // White
  text: "#1e293b",         // Dark Slate
  textSecondary: "#64748b" // Medium Slate
};
```

## 🧪 Testing Quick Checklist

### 2FA Flow
- [ ] Enter email → "Request sent" message
- [ ] Get 6-digit code email
- [ ] Enter code → Success & navigate to devices
- [ ] Code expires after 10 minutes
- [ ] Wrong code → Error message displayed

### Device List
- [ ] Devices load on app start
- [ ] Status shows online/offline
- [ ] Last AQI displays correctly
- [ ] Can select device
- [ ] Add device button works

### Dashboard
- [ ] Shows selected device name
- [ ] AQI displays with correct color
- [ ] Chart shows trend
- [ ] All metrics display
- [ ] Pull-to-refresh updates data

## 🐛 Common Errors & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| "Not authenticated" | No tokens in storage | Complete 2FA flow |
| 401 Unauthorized | Token expired | Auto-refresh (or logout & login) |
| 403 Forbidden | Device not owned by user | Select your device |
| "No device selected" | Navigation error | Go back to devices list |
| Empty readings | Device has no data yet | Wait for sensor to submit |
| Email validation error | Invalid email format | Use valid email address |

## 📞 Quick Help

**Where are tokens stored?**
- AsyncStorage under keys: `@auth_access_token`, `@auth_refresh_token`

**How long do tokens last?**
- Access: 60 minutes
- Refresh: 7 days
- 2FA code: 10 minutes

**How to logout?**
```typescript
const { logout } = useAuth();
await logout();
```

**How to debug API calls?**
```typescript
// Check AsyncStorage
import AsyncStorage from '@react-native-async-storage/async-storage';
const token = await AsyncStorage.getItem('@auth_access_token');
console.log('Token:', token);

// Check network in DevTools
// Look at XHR requests with Authorization header
```

**How to test without backend?**
- Not recommended for Phase 1
- Would need to mock entire API service layer
- Use real backend for testing

---

## 🎓 Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│                  React Native App                    │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │              UI Screens (Views)              │  │
│  │  ┌─────────────────────────────────────────┐ │  │
│  │  │ • request-2fa.tsx                      │ │  │
│  │  │ • verify-2fa.tsx                       │ │  │
│  │  │ • devices.tsx                          │ │  │
│  │  │ • dashboard.tsx                        │ │  │
│  │  │ • add-device.tsx                       │ │  │
│  │  └─────────────────────────────────────────┘ │  │
│  └──────────────────┬───────────────────────────┘  │
│                     │                               │
│  ┌──────────────────▼───────────────────────────┐  │
│  │        Context (State Management)            │  │
│  │  ┌─────────────────────────────────────────┐ │  │
│  │  │ • AuthContext.tsx (JWT + 2FA)          │ │  │
│  │  │ • DeviceContext.tsx (Device + Sensors) │ │  │
│  │  └─────────────────────────────────────────┘ │  │
│  └──────────────────┬───────────────────────────┘  │
│                     │                               │
│  ┌──────────────────▼───────────────────────────┐  │
│  │      API Service Layer (Type-safe)          │  │
│  │  ┌─────────────────────────────────────────┐ │  │
│  │  │ • authApi (2FA, token refresh)          │ │  │
│  │  │ • deviceApi (CRUD devices)              │ │  │
│  │  │ • readingApi (Sensor data)              │ │  │
│  │  │ • alertApi (Alerts management)          │ │  │
│  │  │ • profileApi (User profile)             │ │  │
│  │  └─────────────────────────────────────────┘ │  │
│  └──────────────────┬───────────────────────────┘  │
│                     │                               │
│  ┌──────────────────▼───────────────────────────┐  │
│  │     AsyncStorage (Local Persistence)        │  │
│  │  ┌─────────────────────────────────────────┐ │  │
│  │  │ • @auth_access_token                    │ │  │
│  │  │ • @auth_refresh_token                   │ │  │
│  │  │ • @auth_user                            │ │  │
│  │  └─────────────────────────────────────────┘ │  │
│  └──────────────────┬───────────────────────────┘  │
│                     │ (HTTPS)                      │
│                     │                               │
│  ┌──────────────────▼───────────────────────────┐  │
│  │    Django REST Framework Backend             │  │
│  │    http://localhost:8000/api/                │  │
│  │  • Authentication (JWT + 2FA)               │  │
│  │  • Device Management                        │  │
│  │  • Sensor Readings                          │  │
│  │  • Alerts Management                        │  │
│  │  • User Profiles                            │  │
│  └──────────────────────────────────────────────┘  │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

Last Updated: Phase 1 Complete
Developer Reference Version: 1.0
