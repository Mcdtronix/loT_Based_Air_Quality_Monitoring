# 🔌 API Endpoints Reference

## Base URL
```
http://localhost:8000
```

---

## 🔑 Authentication Endpoints

### Request 2FA Code
```
POST /api/auth/2fa/request/
Content-Type: application/json
Authorization: None required

Request:
{
  "email": "user@example.com"
}

Response 200:
{
  "message": "A verification code has been sent to your email.",
  "session_token": "1"
}

Response 400:
{
  "email": ["User with this email does not exist."]
}
```

### Verify 2FA Code & Get JWT
```
POST /api/auth/2fa/verify/
Content-Type: application/json
Authorization: None required

Request:
{
  "email": "user@example.com",
  "token": "123456"
}

Response 200:
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

Response 400:
{
  "token": ["Invalid 2FA token."]
}
```

### Refresh JWT Access Token
```
POST /api/token/refresh/
Content-Type: application/json
Authorization: None required

Request:
{
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}

Response 200:
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}

Response 401:
{
  "detail": "Token is invalid or expired.",
  "code": "token_not_valid"
}
```

---

## 👤 Profile Endpoints

### Get User Profile
```
GET /api/profiles/
Authorization: Bearer {access_token}

Response 200:
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": [
    {
      "user": {
        "id": 1,
        "username": "john_doe",
        "email": "john@example.com",
        "first_name": "John",
        "last_name": "Doe"
      },
      "phone": "+1234567890",
      "medical_condition": "Asthma",
      "created_at": "2026-04-16T09:00:00Z",
      "two_factor_enabled": true
    }
  ]
}
```

### Create Profile
```
POST /api/profiles/
Content-Type: application/json
Authorization: Bearer {access_token}

Request:
{
  "phone": "+1234567890",
  "medical_condition": "Asthma",
  "two_factor_enabled": true
}

Response 201:
{
  "user": {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com",
    "first_name": "John",
    "last_name": "Doe"
  },
  "phone": "+1234567890",
  "medical_condition": "Asthma",
  "created_at": "2026-04-16T09:00:00Z",
  "two_factor_enabled": true
}
```

### Update Profile
```
PUT /api/profiles/{id}/
PATCH /api/profiles/{id}/
Content-Type: application/json
Authorization: Bearer {access_token}

Request (PATCH):
{
  "phone": "+1234567890"
}

Response 200:
{ ... updated profile ... }
```

### Delete Profile
```
DELETE /api/profiles/{id}/
Authorization: Bearer {access_token}

Response 204: No Content
```

---

## 📱 Device Endpoints

### List Devices
```
GET /api/devices/
Authorization: Bearer {access_token}

Query Parameters:
- page: 1
- page_size: 20

Response 200:
{
  "count": 5,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "device_id": "IOT-001",
      "device_name": "Living Room",
      "is_online": true,
      "last_updated": "2026-04-16T10:30:00Z",
      "created_at": "2026-04-15T09:00:00Z"
    },
    {
      "id": 2,
      "device_id": "IOT-002",
      "device_name": "Bedroom",
      "is_online": false,
      "last_updated": "2026-04-16T08:30:00Z",
      "created_at": "2026-04-14T09:00:00Z"
    }
  ]
}
```

### Get Single Device
```
GET /api/devices/{id}/
Authorization: Bearer {access_token}

Response 200:
{
  "id": 1,
  "device_id": "IOT-001",
  "device_name": "Living Room",
  "is_online": true,
  "last_updated": "2026-04-16T10:30:00Z",
  "created_at": "2026-04-15T09:00:00Z"
}
```

### Register New Device
```
POST /api/devices/
Content-Type: application/json
Authorization: Bearer {access_token}

Request:
{
  "device_id": "IOT-003",
  "device_name": "Kitchen Sensor",
  "is_online": true
}

Response 201:
{
  "id": 3,
  "device_id": "IOT-003",
  "device_name": "Kitchen Sensor",
  "is_online": true,
  "last_updated": null,
  "created_at": "2026-04-16T11:00:00Z"
}
```

### Update Device
```
PUT /api/devices/{id}/
PATCH /api/devices/{id}/
Content-Type: application/json
Authorization: Bearer {access_token}

Request (PATCH):
{
  "device_name": "Kitchen",
  "is_online": false
}

Response 200:
{ ... updated device ... }
```

### Delete Device
```
DELETE /api/devices/{id}/
Authorization: Bearer {access_token}

Response 204: No Content
(Cascades: Deletes all readings and alerts for this device)
```

---

## 📊 Sensor Reading Endpoints

### List All Readings
```
GET /api/readings/
Authorization: Bearer {access_token}

Query Parameters:
- device: {device_id}   (filter by device)
- page: 1
- page_size: 20

Response 200:
{
  "count": 1000,
  "next": "http://localhost:8000/api/readings/?page=2",
  "previous": null,
  "results": [
    {
      "id": 1,
      "device": 1,
      "timestamp": "2026-04-16T10:30:00Z",
      "pm25": 35.5,
      "pm10": 45.2,
      "co2": 420.8,
      "humidity": 65.5,
      "temperature": 22.3,
      "dust": 15.2,
      "aqi": 87
    }
  ]
}
```

### Get Single Reading
```
GET /api/readings/{id}/
Authorization: Bearer {access_token}

Response 200:
{
  "id": 1,
  "device": 1,
  "timestamp": "2026-04-16T10:30:00Z",
  "pm25": 35.5,
  "pm10": 45.2,
  "co2": 420.8,
  "humidity": 65.5,
  "temperature": 22.3,
  "dust": 15.2,
  "aqi": 87
}
```

### Submit Sensor Reading (IoT Device)
```
POST /api/readings/
Content-Type: application/json
Authorization: Bearer {access_token}

Request:
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

Response 201:
{
  "id": 1,
  "device": 1,
  "timestamp": "2026-04-16T11:00:00Z",
  "pm25": 35.5,
  "pm10": 45.2,
  "co2": 420.8,
  "carbon_monoxide": 2.1,
  "nitrogen_oxide": 0.04,
  "humidity": 65.5,
  "temperature": 22.3,
  "dust": 15.2,
  "aqi": 87
}

Response 400:
{
  "pm25": ["Ensure this value is greater than or equal to 0."],
  "humidity": ["Ensure this value is less than or equal to 100."]
}
```

### Submit Module Reading by Device Name

```
POST /api/readings/upload/
Content-Type: application/json

Request:
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

The `device_name` value must exactly match the device name registered in the application and stored in the Arduino module code.
The first upload for a device creates a reading. Later uploads for the same device replace that device's latest reading instead of creating more rows.

### Update Reading
```
PUT /api/readings/{id}/
PATCH /api/readings/{id}/
Content-Type: application/json
Authorization: Bearer {access_token}

Request (PATCH):
{
  "pm25": 40.0
}

Response 200:
{ ... updated reading ... }
```

### Delete Reading
```
DELETE /api/readings/{id}/
Authorization: Bearer {access_token}

Response 204: No Content
```

### Get Readings for Device
```
GET /api/readings/?device=1
Authorization: Bearer {access_token}

Response 200:
{
  "count": 500,
  "next": "...",
  "previous": null,
  "results": [
    { ... readings for device 1 ... }
  ]
}
```

---

## ⚠️ Alert Endpoints

### List Alerts
```
GET /api/alerts/
Authorization: Bearer {access_token}

Query Parameters:
- page: 1
- page_size: 20

Response 200:
{
  "count": 50,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "device": 1,
      "timestamp": "2026-04-16T10:30:00Z",
      "alert_type": "warning",
      "message": "PM2.5 levels exceeded safe threshold",
      "aqi": 87,
      "read": false
    }
  ]
}
```

### Get Single Alert
```
GET /api/alerts/{id}/
Authorization: Bearer {access_token}

Response 200:
{
  "id": 1,
  "device": 1,
  "timestamp": "2026-04-16T10:30:00Z",
  "alert_type": "warning",
  "message": "PM2.5 levels exceeded safe threshold",
  "aqi": 87,
  "read": false
}
```

### Create Alert
```
POST /api/alerts/
Content-Type: application/json
Authorization: Bearer {access_token}

Request:
{
  "device": 1,
  "alert_type": "warning",
  "message": "PM2.5 levels exceeded safe threshold",
  "aqi": 87
}

Response 201:
{
  "id": 1,
  "device": 1,
  "timestamp": "2026-04-16T11:00:00Z",
  "alert_type": "warning",
  "message": "PM2.5 levels exceeded safe threshold",
  "aqi": 87,
  "read": false
}
```

### Mark Alert as Read
```
POST /api/alerts/{id}/mark_read/
Authorization: Bearer {access_token}

Response 200:
{
  "status": "alert marked as read"
}
```

### Mark All Alerts as Read
```
POST /api/alerts/mark_all_read/
Authorization: Bearer {access_token}

Response 200:
{
  "status": "all alerts marked as read"
}
```

### Update Alert
```
PUT /api/alerts/{id}/
PATCH /api/alerts/{id}/
Content-Type: application/json
Authorization: Bearer {access_token}

Request (PATCH):
{
  "read": true
}

Response 200:
{ ... updated alert ... }
```

### Delete Alert
```
DELETE /api/alerts/{id}/
Authorization: Bearer {access_token}

Response 204: No Content
```

---

## 📚 Documentation Endpoints

### OpenAPI Schema
```
GET /api/schema/
Content-Type: application/json

Returns raw OpenAPI 3.0 schema
```

### Swagger UI
```
GET /api/docs/

Interactive API documentation
- Test all endpoints
- View request/response examples
- Try endpoints with your tokens
```

### ReDoc
```
GET /api/redoc/

Alternative API documentation format
```

---

## 🔍 Query Filter Examples

### Filter Readings by Date Range
```
GET /api/readings/?created_at__gte=2026-04-16&created_at__lte=2026-04-17
Authorization: Bearer {access_token}
```

### Filter by Device
```
GET /api/readings/?device=1
Authorization: Bearer {access_token}
```

### Filter by Alert Type
```
GET /api/alerts/?alert_type=warning
Authorization: Bearer {access_token}
```

### Pagination
```
GET /api/devices/?page=2&page_size=50
Authorization: Bearer {access_token}
```

---

## 📝 HTTP Status Codes

| Code | Meaning | Common Causes |
|------|---------|---------------|
| 200 | OK | Successful GET, PUT, PATCH |
| 201 | Created | Successful POST |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Invalid data, validation error |
| 401 | Unauthorized | Missing/invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 405 | Method Not Allowed | Wrong HTTP method |
| 429 | Too Many Requests | Rate limited |
| 500 | Server Error | Internal error |

---

## 🔐 Authorization Header

All protected endpoints require:
```
Authorization: Bearer {access_token}
```

Where `{access_token}` is obtained from 2FA verification response.

---

## ⏱️ Token Expiration

- **Access Token:** 60 minutes
- **Refresh Token:** 7 days

When access token expires, use refresh token:
```
POST /api/token/refresh/
Content-Type: application/json

{
  "refresh": "{refresh_token}"
}
```

---

## 🔒 Rate Limiting (Future)

Not currently implemented but will include:
- 100 requests per minute per user
- 2FA attempts: 3 per token
- Email sending: 5 per hour per user

---

## 📱 Mobile App Integration

### Recommended Flow:
1. User enters email
2. Call `/api/auth/2fa/request/`
3. User receives code via email
4. User enters code
5. Call `/api/auth/2fa/verify/`
6. Store access & refresh tokens securely
7. Use access token for all API calls
8. Refresh before expiration
9. Re-authenticate when refresh expires

### Token Storage (Mobile):
- **Android:** Encrypted SharedPreferences
- **iOS:** Keychain
- **React Native:** Secure Storage library

---

## 🧪 cURL Testing Examples

### Test 2FA Request
```bash
curl -X POST http://localhost:8000/api/auth/2fa/request/ \
  -H "Content-Type: application/json" \
  -d '{"email": "admin1@example.com"}'
```

### Test Device List
```bash
curl -X GET http://localhost:8000/api/devices/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Test Sensor Reading Submit
```bash
curl -X POST http://localhost:8000/api/readings/upload/ \
  -H "Content-Type: application/json" \
  -d '{
    "device_name": "Living Room Sensor",
    "pm25": 35.5,
    "pm10": 45.2,
    "co2": 420.8,
    "carbon_monoxide": 2.1,
    "nitrogen_oxide": 0.04,
    "humidity": 65.5,
    "temperature": 22.3,
    "dust": 15.2
  }'
```

---

**Version:** 1.0
**Last Updated:** April 16, 2026
**Status:** ✅ All Endpoints Documented
