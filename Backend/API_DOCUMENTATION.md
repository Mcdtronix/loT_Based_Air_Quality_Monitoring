# Air Quality Monitor API - Professional Implementation Guide

## Overview
This document describes the professional-grade backend implementation with:
- **Swagger/OpenAPI Documentation**
- **JWT Authentication**
- **Two-Factor Authentication (2FA) via Email**
- **RESTful API for IoT Sensor Data**

---

## 🔐 Security Features

### 1. Two-Factor Authentication (2FA)
- Email-based 6-digit verification codes
- 10-minute token expiration (configurable)
- Maximum 3 verification attempts per token
- Automatic token validation and cleanup
- Session-based tracking

### 2. JWT Authentication
- Access tokens with 60-minute expiration
- Refresh tokens with 7-day expiration
- HS256 signing algorithm
- Stateless token management

### 3. Email Configuration
Configured with Gmail SMTP:
```
EMAIL_HOST: smtp.gmail.com
EMAIL_PORT: 587
EMAIL_USE_TLS: True
```

---

## 📚 API Documentation

### Swagger UI
**URL:** `http://localhost:8000/api/docs/`

Interactive API documentation where you can test all endpoints directly.

### ReDoc Documentation
**URL:** `http://localhost:8000/api/redoc/`

Alternative API documentation in ReDoc format.

### OpenAPI Schema
**URL:** `http://localhost:8000/api/schema/`

Raw OpenAPI 3.0 schema in JSON format.

---

## 🔑 Authentication Flow

### Step 1: Request 2FA Code
**Endpoint:** `POST /api/auth/2fa/request/`

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (200):**
```json
{
  "message": "A verification code has been sent to your email.",
  "session_token": "1"
}
```

**Error Responses:**
- `400`: User not found or 2FA not enabled
- `500`: Email sending failed

---

### Step 2: Verify 2FA Code & Get JWT Token
**Endpoint:** `POST /api/auth/2fa/verify/`

**Request Body:**
```json
{
  "email": "user@example.com",
  "token": "123456"
}
```

**Response (200):**
```json
{
  "message": "2FA verification successful.",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": {
    "id": 1,
    "username": "john_doe",
    "email": "user@example.com",
    "first_name": "John"
  }
}
```

**Error Responses:**
- `400`: Invalid token, expired token, or max attempts exceeded
- `404`: User not found

---

### Step 3: Use JWT Token for API Calls
Add the access token to request headers:
```
Authorization: Bearer <access_token>
```

---

## 📡 API Endpoints

### Profiles
- `GET /api/profiles/` - List user's profile
- `POST /api/profiles/` - Create profile
- `PUT /api/profiles/{id}/` - Update profile
- `DELETE /api/profiles/{id}/` - Delete profile

### Devices
- `GET /api/devices/` - List user's devices
- `POST /api/devices/` - Register new device
- `PUT /api/devices/{id}/` - Update device
- `DELETE /api/devices/{id}/` - Delete device

**Device Registration Example:**
```json
{
  "device_id": "IOT-001",
  "device_name": "Living Room Sensor",
  "is_online": true
}
```

---

### Sensor Readings
- `GET /api/readings/` - Get all readings
- `GET /api/readings/?device=1` - Filter by device
- `POST /api/readings/` - Submit sensor reading
- `POST /api/readings/upload/` - Submit module sensor reading using registered device name
- `PUT /api/readings/{id}/` - Update reading

**Sensor Reading Submission (Application):**
```json
{
  "device": 1,
  "pm25": 35.5,
  "pm10": 45.2,
  "co2": 420.8,
  "carbon_monoxide": 2.1,
  "nitrogen_oxide": 0.04,
  "humidity": 65.5,
  "temperature": 22.3,
  "dust": 15.2
}
```

**Sensor Reading Submission (Arduino/IoT Module):**
```json
{
  "device_name": "Living Room Sensor",
  "pm25": 35.5,
  "pm10": 45.2,
  "co2": 420.8,
  "carbon_monoxide": 2.1,
  "nitrogen_oxide": 0.04,
  "humidity": 65.5,
  "temperature": 22.3,
  "dust": 15.2
}
```

Module uploads are stored as the current live reading for the matched device. The first upload creates a reading; later uploads for the same device replace the latest reading instead of creating additional rows.

**Sensor Data Fields:**
- `device_name`: Registered device name. For module uploads, this must match the name saved in the application and in the Arduino code.
- `pm25`: PM2.5 concentration (µg/m³) - Min: 0
- `pm10`: PM10 concentration (µg/m³) - Min: 0
- `co2`: Carbon dioxide level (ppm) - Min: 0
- `carbon_monoxide`: Carbon monoxide level (ppm) - Min: 0
- `nitrogen_oxide`: Nitrogen oxide level (ppm NO2-equivalent) - Min: 0
- `humidity`: Relative humidity (%) - Range: 0-100
- `temperature`: Temperature (°C)
- `dust`: Dust concentration (µg/m³) - Min: 0
- `aqi`: Air Quality Index (auto-calculated) - Range: 0-500

**AQI Calculation (Simplified):**
- Based on PM2.5, PM10, carbon monoxide, and nitrogen oxide levels
- Uses EPA-like formula
- Auto-computed on save

---

### Alerts
- `GET /api/alerts/` - Get all alerts for user's devices
- `POST /api/alerts/{id}/mark_read/` - Mark alert as read
- `POST /api/alerts/mark_all_read/` - Mark all alerts as read

**Alert Types:**
- `warning` - Air quality warning
- `danger` - Critical air quality alert
- `info` - Informational alert

---

## 🗄️ Database Schema

### Models

#### Profile
- Linked to Django User model (one-to-one)
- Phone number storage
- Medical condition tracking
- 2FA enabled flag

#### TwoFactorToken
- 6-digit random token
- Expiration timestamp
- Attempt counter
- Used flag
- Session tracking

#### Device
- Device unique identifier
- Device name/label
- Online status
- Last update timestamp
- User association

#### SensorReading
- Device association
- Timestamp
- PM2.5, PM10, CO2, humidity, temperature, dust
- Calculated AQI
- Indexed by device and timestamp for performance

#### Alert
- Device association
- Alert type
- Message content
- AQI value
- Read status
- Timestamp

---

## 🚀 Usage Examples

### cURL Examples

#### Request 2FA Code
```bash
curl -X POST http://localhost:8000/api/auth/2fa/request/ \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'
```

#### Verify 2FA and Get JWT
```bash
curl -X POST http://localhost:8000/api/auth/2fa/verify/ \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "token": "123456"}'
```

#### Get Devices (Authenticated)
```bash
curl -X GET http://localhost:8000/api/devices/ \
  -H "Authorization: Bearer <access_token>"
```

#### Submit Sensor Reading
```bash
curl -X POST http://localhost:8000/api/readings/ \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "device": 1,
    "pm25": 35.5,
    "pm10": 45.2,
    "co2": 420.8,
    "humidity": 65.5,
    "temperature": 22.3,
    "dust": 15.2
  }'
```

---

## ⚙️ Configuration

### Environment Variables (.env)
```
# Email Configuration
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=gudomacdonald16@gmail.com
EMAIL_HOST_PASSWORD=cbld psyv olpd kbei
EMAIL_USE_TLS=True
EMAIL_USE_SSL=False
DEFAULT_FROM_EMAIL=gudomacdonald16@gmail.com
FRONTEND_BASE_URL=http://localhost:8081

# Two-Factor Authentication
TWO_FACTOR_ENABLED=True
TWO_FACTOR_TOKEN_EXPIRE_MINUTES=10
TWO_FACTOR_MAX_ATTEMPTS=3

# Django Settings
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0
SECRET_KEY=your-secret-key-here
```

---

## 🔧 Admin Panel

### Access
**URL:** `http://localhost:8000/admin/`

**Credentials:**
- Username: `admin1`
- Password: (as configured during setup)

### Managed Models
1. **Profiles** - User profiles with 2FA settings
2. **Devices** - IoT device registration and management
3. **Sensor Readings** - Historical sensor data with AQI
4. **Alerts** - System-generated alerts
5. **Two-Factor Tokens** - 2FA token management and audit

---

## 📊 Data Normalization & Relationships

### Database Design Principles Applied:
1. **Normalization**: Each entity has a single responsibility
2. **Referential Integrity**: Foreign keys with cascade delete
3. **Indexing**: Optimized queries on device and timestamp
4. **Validation**: Field validators for data ranges
5. **Audit Trail**: Timestamps on all critical records

### Relationship Diagram:
```
User (Django Auth)
├── Profile (one-to-one)
│   └── two_factor_enabled
├── Device (one-to-many)
│   ├── SensorReading (one-to-many)
│   │   ├── pm25, pm10, co2
│   │   ├── humidity, temperature, dust
│   │   └── aqi (calculated)
│   └── Alert (one-to-many)
│       ├── alert_type
│       └── message
└── TwoFactorToken (one-to-many)
    ├── token
    ├── expires_at
    └── attempts
```

---

## 🔄 JWT Token Management

### Get New Access Token (Using Refresh Token)
**Endpoint:** `POST /api/token/refresh/`

**Request Body:**
```json
{
  "refresh": "your_refresh_token"
}
```

**Response:**
```json
{
  "access": "new_access_token"
}
```

---

## 🛡️ Security Best Practices Implemented

1. **Password Protection**: Django's built-in password hashing
2. **CSRF Protection**: Enabled by default
3. **SQL Injection Prevention**: ORM usage throughout
4. **XSS Protection**: Django template escaping
5. **Token Expiration**: Both access and refresh tokens expire
6. **Rate Limiting**: Ready to implement via middleware
7. **HTTPS Ready**: Deploy-ready configuration
8. **Email Verification**: 2FA prevents unauthorized access
9. **Attempt Limiting**: Max 3 attempts per 2FA token
10. **Audit Logging**: All 2FA tokens tracked in admin

---

## 📱 IoT Device Integration

### For PM2.5, PM10, CO2, Humidity, Temperature, Dust Sensors:

1. **Device Registration**
   - Create device with unique `device_id`
   - Store JWT access token securely on device

2. **Data Submission**
   ```json
   {
     "device": <device_id>,
     "pm25": <value>,
     "pm10": <value>,
     "co2": <value>,
     "humidity": <value>,
     "temperature": <value>,
     "dust": <value>
   }
   ```

3. **Response Handling**
   - HTTP 201: Data accepted
   - HTTP 400: Validation error
   - HTTP 401: Unauthorized (token expired)

4. **Recommended Intervals**
   - Readings: Every 30-60 seconds
   - Token refresh: Every 24 hours

---

## 🎯 Next Steps for Production

1. **Database**: Migrate to PostgreSQL
2. **Caching**: Implement Redis for performance
3. **Monitoring**: Add error tracking (Sentry)
4. **Logging**: Implement centralized logging
5. **Rate Limiting**: Add throttling via DRF
6. **CORS**: Configure for frontend domain
7. **SSL/TLS**: Enable HTTPS
8. **Backups**: Implement automated backups
9. **Load Balancing**: Deploy behind load balancer
10. **Alert System**: Integrate with notification service

---

## 📞 Support

For API issues or feature requests, check:
- Swagger documentation for request/response formats
- Admin panel for data verification
- Django logs for detailed error messages

---

**Last Updated:** April 16, 2026
**Version:** 1.0.0
**Status:** Production Ready
