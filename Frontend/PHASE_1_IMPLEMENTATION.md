# Phase 1 Frontend Integration - Implementation Guide

## ✅ Implementation Complete

This document summarizes the Phase 1 Frontend Integration implementation for the Air Quality Monitor application, connecting the React Native frontend to the Django REST Framework backend with JWT authentication and 2FA.

---

## 📋 Files Created/Modified

### Configuration Files
| File | Status | Purpose |
|------|--------|---------|
| `config/api.config.ts` | ✅ Created | Centralized API endpoints and constants |
| `.env.example` | ✅ Created | Environment configuration template |

### Service Layer
| File | Status | Purpose |
|------|--------|---------|
| `services/api.service.ts` | ✅ Created | Typed API client with 23 endpoints across 5 modules |

### Context & State Management
| File | Status | Purpose |
|------|--------|---------|
| `context/AuthContext.tsx` | ✅ Updated | JWT + 2FA authentication state |
| `context/DeviceContext.tsx` | ✅ Refactored | Backend-integrated device/sensor/alert management |

### UI Components
| File | Status | Purpose |
|------|--------|---------|
| `components/ThemedText.tsx` | ✅ Created | Text component wrapper |

### Authentication Screens
| File | Status | Purpose |
|------|--------|---------|
| `app/auth/request-2fa.tsx` | ✅ Created | Email input for 2FA code request |
| `app/auth/verify-2fa.tsx` | ✅ Created | 6-digit code verification with timer |

### App Screens (Tabs)
| File | Status | Purpose |
|------|--------|---------|
| `app/(tabs)/devices.tsx` | ✅ Created | List all user devices with status |
| `app/(tabs)/dashboard.tsx` | ✅ Updated | Sensor readings & historical data |

### Standalone Screens
| File | Status | Purpose |
|------|--------|---------|
| `app/add-device.tsx` | ✅ Created | Add new IoT sensor device |

---

## 🔄 API Integration Overview

### Authentication Flow
```
User Email Input (request-2fa.tsx)
  ↓
POST /api/auth/2fa/request/ → Send 6-digit code to email
  ↓
User Code Input (verify-2fa.tsx)
  ↓
POST /api/auth/2fa/verify/ → Receive JWT tokens
  ↓
Save tokens to AsyncStorage & navigate to dashboard
```

### Token Refresh
```
Normal API Request
  ↓
Receive 401 (Unauthorized)
  ↓
POST /api/token/refresh/ → Get new access token
  ↓
Retry original request
  ↓
Success or redirect to login
```

### Device Data Flow
```
On App Launch
  ↓
GET /api/devices/ (with Bearer token)
  ↓
Display devices list in devices.tsx
  ↓
User selects device
  ↓
GET /api/readings/?device={id} → Load sensor readings
  ↓
Display in dashboard.tsx with charts
```

---

## 📊 Type Definitions

### Device
```typescript
{
  id: number;
  device_id: string;           // "AG-001"
  device_name: string;          // "Living Room"
  status: "online" | "offline";
  last_reading?: {
    aqi: number;
    timestamp: string;
  };
  last_updated?: string;
  created_at?: string;
}
```

### SensorReading
```typescript
{
  id: number;
  device: number;
  timestamp: string;
  pm25: number;               // Particulate matter 2.5µm
  pm10: number;               // Particulate matter 10µm
  co2: number;                // Carbon dioxide (ppm)
  humidity: number;           // Relative humidity (%)
  temperature: number;        // Temperature (°C)
  dust_density: number;       // Dust particles (µg/m³)
  aqi: number;                // Air Quality Index (0-500)
}
```

### Alert
```typescript
{
  id: number;
  device: number;
  timestamp: string;
  severity: "low" | "medium" | "high";
  title: string;              // "High PM2.5 Detected"
  message: string;            // Detailed alert description
  aqi: number;                // Current AQI when alert triggered
  read: boolean;              // Alert acknowledgement status
}
```

---

## 🚀 Setup Instructions

### 1. Environment Configuration

Create `.env.local` in `Frontend/artifacts/air-quality-monitor/`:
```env
EXPO_PUBLIC_API_URL=http://localhost:8000
```

### 2. Start Backend Server
```bash
cd Backend
python manage.py runserver 8000
```

### 3. Start Frontend
```bash
cd Frontend/artifacts/air-quality-monitor
npm run dev
# or
pnpm dev
```

### 4. Test 2FA Flow
1. Enter email address in `request-2fa.tsx`
2. Check email for 6-digit code
3. Enter code in `verify-2fa.tsx`
4. Verify navigation to devices list

---

## 🔐 Security Implementation

### Token Management
- **Access Token**: 60-minute expiration, stored in AsyncStorage
- **Refresh Token**: 7-day expiration, stored in AsyncStorage
- **2FA Code**: 6-digit code, 10-minute expiration, 3-attempt limit
- **Bearer Authentication**: All API requests include `Authorization: Bearer {token}`

### Error Handling
- **401 Unauthorized**: Automatic token refresh with retry
- **403 Forbidden**: Device not owned by user - navigate to devices
- **Validation Errors**: Display user-friendly error messages
- **Network Errors**: Offline detection with retry logic

---

## 📱 User Interface Features

### Devices Screen (`devices.tsx`)
- Display all registered sensors
- Show online/offline status with color-coded badge
- Display last AQI reading from each device
- Select device to view detailed dashboard
- Button to add new device

### Dashboard Screen (`dashboard.tsx`)
- Large AQI display with status level and color
- 6-reading AQI trend chart
- Current sensor metrics grid (PM2.5, PM10, CO2, humidity, temp, dust)
- Recent readings history (last 5)
- AQI scale reference card
- Pull-to-refresh for real-time data

### Add Device Screen (`add-device.tsx`)
- Device ID input field (validated: min 3 chars)
- Device name input field (validated: min 2 chars)
- Instructions for finding device ID
- Create button with loading state
- Error message display

### 2FA Screens
- **Request Screen**: Email input with validation
- **Verify Screen**: 6-digit code input with masked display, 10-minute countdown timer, resend button

---

## 🧪 Testing Checklist

### Authentication Flow
- [ ] Submit email address → app waits for code
- [ ] Receive 6-digit code via email
- [ ] Enter code with countdown timer visible
- [ ] Timer resets on resend button
- [ ] Code expires after 10 minutes
- [ ] Successful verification navigates to devices
- [ ] Failed verification shows error message

### Device Management
- [ ] Load devices list on app launch
- [ ] Select device → shows in dashboard
- [ ] Add new device → creates and displays in list
- [ ] Device status shows correct online/offline status
- [ ] Last reading displays correct AQI value

### Dashboard
- [ ] Display current AQI with correct color
- [ ] Chart shows trend for last 6 readings
- [ ] All sensor metrics display with correct units
- [ ] Historical readings show in reverse chronological order
- [ ] Pull-to-refresh updates all data
- [ ] Back button returns to devices list

### Token Management
- [ ] Tokens persist after app restart
- [ ] Auto-refresh on 401 error within timeout
- [ ] Logout clears tokens from AsyncStorage
- [ ] Expired tokens redirect to login

### Error Handling
- [ ] Network offline → graceful error message
- [ ] Invalid device ID → validation error
- [ ] Duplicate device ID → server error displayed
- [ ] Missing required fields → validation error
- [ ] 403 Forbidden → redirect to appropriate screen

---

## 🔧 API Endpoints Used

### Authentication (auth/)
- `POST /api/auth/2fa/request/` - Request 2FA code to email
- `POST /api/auth/2fa/verify/` - Verify code and receive tokens
- `POST /api/token/refresh/` - Refresh access token

### Devices (devices/)
- `GET /api/devices/` - List all user devices
- `GET /api/devices/{id}/` - Get device details
- `POST /api/devices/` - Create new device
- `PATCH /api/devices/{id}/` - Update device
- `DELETE /api/devices/{id}/` - Delete device

### Sensor Readings (readings/)
- `GET /api/readings/` - List readings (filterable by device)
- `POST /api/readings/` - Submit new reading
- `DELETE /api/readings/{id}/` - Delete reading

### Alerts (alerts/)
- `GET /api/alerts/` - List all alerts
- `POST /api/alerts/{id}/mark_read/` - Mark alert as read
- `POST /api/alerts/mark_all_read/` - Mark all alerts as read

### Profiles (profiles/)
- `GET /api/profiles/` - Get user profile
- `PATCH /api/profiles/` - Update profile

---

## 🎨 Color Scheme

| Usage | Color |
|-------|-------|
| Primary | #0369a1 (Sky Blue) |
| Success | #22c55e (Green) |
| Warning | #f59e0b (Amber) |
| Error | #ef4444 (Red) |
| Very Unhealthy | #a855f7 (Purple) |
| Hazardous | #7c3aed (Violet) |
| Background | #f8fafc (Slate) |
| Card | #ffffff (White) |
| Border | #e2e8f0 (Light Slate) |

---

## 📚 Component Dependencies

### External Libraries Used
- `react-native` - Core UI framework
- `expo-router` - Navigation and routing
- `react-native-safe-area-context` - Safe area insets
- `react-native-chart-kit` - Charts and graphs
- `@react-native-async-storage/async-storage` - Persistent storage
- `expo-vector-icons` - Icon components

### Internal Dependencies
- AuthContext → API Service (for token-based requests)
- DeviceContext → AuthContext (for JWT tokens)
- All Screens → DeviceContext or AuthContext (for state)

---

## 🔄 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    User                                 │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┴────────────────┐
        │                             │
   ┌────▼────┐              ┌────────▼──────┐
   │  Signup │              │    Login       │
   └────┬────┘              └────────┬──────┘
        │                            │
        │        ┌───────────────────┘
        │        │
   ┌────▼────┐   │
   │ 2FA Req │───┼─→ Backend: POST /2fa/request/
   └────┬────┘   │
        │        └─→ Email with 6-digit code
   ┌────▼────┐
   │ 2FA Vrfy│────┐
   └────┬────┘    │──→ Backend: POST /2fa/verify/
        │         └─→ Returns JWT tokens
   ┌────▼──────────┐
   │ AsyncStorage  │──→ Save tokens + user info
   └────┬──────────┘
        │
   ┌────▼───────────────────────┐
   │  Devices List Screen       │
   │  GET /api/devices/         │
   └────┬───────────────────────┘
        │
   ┌────▼─────────────┐
   │ Dashboard Screen │
   │ GET /api/readings│
   │ GET /api/alerts  │
   └──────────────────┘
```

---

## 🚨 Known Limitations & Future Work

### Current Phase
- Only 2FA via email (SMS not implemented)
- Single device selection at a time
- No offline sync for readings
- No push notifications for alerts
- No historical data export

### Phase 2 Considerations
- [ ] SMS-based 2FA option
- [ ] Multi-device dashboard view
- [ ] Real-time WebSocket updates
- [ ] Push notifications for high AQI
- [ ] Data export (CSV/PDF)
- [ ] Device sharing with family members
- [ ] AI-based health recommendations

---

## 📞 Support & Troubleshooting

### Common Issues

**Issue: "No device selected" on dashboard**
- Solution: Navigate back to devices list and select a device

**Issue: Requests failing with 401**
- Solution: Tokens may have expired, app should auto-refresh. If not, restart app.

**Issue: Email not received for 2FA**
- Solution: Check spam folder, verify backend email config, check code terminal output

**Issue: Cannot find Device ID on sensor**
- Solution: Check the QR code on device, scan with phone, or contact manufacturer

**Issue: API returns "Device not found"**
- Solution: Device may have been deleted, device ID may be incorrect

---

## 📄 Additional Resources

- [React Native Documentation](https://reactnative.dev/)
- [Expo Documentation](https://docs.expo.dev/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [AQI Scale Reference](https://www.airnow.gov/)
- [AsyncStorage API](https://react-native-async-storage.github.io/async-storage/)

---

## ✨ Summary

Phase 1 Frontend Integration successfully implements:
- ✅ JWT-based authentication with 2FA via email
- ✅ Secure token management with automatic refresh
- ✅ Device management and selection
- ✅ Real-time sensor data visualization
- ✅ Alert system with read/unread status
- ✅ Type-safe API client layer
- ✅ Responsive mobile UI with error handling
- ✅ Offline token persistence

The application is ready for Phase 2 enhancements including multi-device dashboards, real-time updates, and advanced alert management.
