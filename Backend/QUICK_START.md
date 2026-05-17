# 🚀 Air Quality Monitor Backend - Quick Start Guide

## ✅ What's Been Implemented

### 1. **Swagger/OpenAPI Documentation** ✓
- Interactive API explorer at `http://localhost:8000/api/docs/`
- ReDoc documentation at `http://localhost:8000/api/redoc/`
- Auto-generated from code docstrings
- Test endpoints directly from browser

### 2. **Two-Factor Authentication (2FA via Email)** ✓
- 6-digit verification codes sent via Gmail SMTP
- 10-minute token expiration
- Maximum 3 verification attempts
- Database tracking of all 2FA attempts
- Admin panel management

### 3. **JWT Authentication** ✓
- 60-minute access tokens
- 7-day refresh tokens
- HS256 signing
- Full stateless authentication

### 4. **Environment Configuration** ✓
- `.env` file with email settings
- Configurable token expiration
- 2FA settings
- ALLOWED_HOSTS configuration

### 5. **Fully Normalized Database Schema** ✓
- Profile model with 2FA tracking
- Device model for IoT sensor registration
- SensorReading model for PM2.5, PM10, CO2, carbon monoxide, nitrogen oxide, humidity, temperature, dust
- Alert model for thresholds
- TwoFactorToken model for 2FA tracking
- Proper indexing for performance

### 6. **Professional API Endpoints** ✓

**Authentication:**
- `POST /api/auth/2fa/request/` - Request 2FA code
- `POST /api/auth/2fa/verify/` - Verify code & get JWT

**Data Management:**
- Device registration and management
- Sensor reading storage with AQI calculation
- Alert generation and management
- User profile management

### 7. **Data Validation** ✓
- Field-level validation (min/max values)
- PM2.5, PM10: Non-negative values
- Humidity: 0-100% range
- Temperature: Unrestricted (Celsius)
- AQI: 0-500 range (auto-calculated)

---

## 🔧 Installation & Setup

### 1. Install Dependencies
```bash
cd Backend
source env/bin/activate
pip install drf-spectacular django-otp python-decouple
```

### 2. Create Environment File
```bash
# Already created at Backend/.env
# Contains email configuration and 2FA settings
```

### 3. Run Migrations
```bash
python manage.py makemigrations
python manage.py migrate
```

### 4. Create Admin User
```bash
python manage.py createsuperuser
# Username: admin1
# Password: (created interactively)
```

### 5. Start Server
```bash
python manage.py runserver 0.0.0.0:8000
```

---

## 📚 Key Features

### Email Configuration
```
Provider: Gmail SMTP
Host: smtp.gmail.com
Port: 587
Security: TLS
```

### 2FA Flow
1. User requests code: `/api/auth/2fa/request/`
2. System generates 6-digit code
3. Email sent to user
4. User submits code: `/api/auth/2fa/verify/`
5. JWT tokens returned on success

### Sensor Data Fields
```
- pm25: PM2.5 concentration (µg/m³)
- pm10: PM10 concentration (µg/m³)
- co2: Carbon dioxide (ppm)
- carbon_monoxide: Carbon monoxide (ppm)
- nitrogen_oxide: Nitrogen oxide (ppm NO2-equivalent)
- humidity: Relative humidity (%)
- temperature: Temperature (°C)
- dust: Dust concentration (µg/m³)
- aqi: Air Quality Index (auto-calculated)
```

---

## 🔐 Security Layers

| Layer | Protection |
|-------|-----------|
| Authentication | JWT tokens with expiration |
| 2FA | Email verification codes |
| Database | Normalized schema, transaction safety |
| API | Token-based authentication required |
| Email | Rate limiting via token expiration |
| Admin | Standard Django admin protection |

---

## 📊 Admin Panel Access

**URL:** http://localhost:8000/admin/

**Models Managed:**
1. Profiles - User 2FA settings
2. Devices - IoT device registration
3. Sensor Readings - Historical data
4. Alerts - Threshold-based alerts
5. Two-Factor Tokens - 2FA audit trail

---

## 🧪 Testing the API

### 1. Request 2FA Code
```bash
curl -X POST http://localhost:8000/api/auth/2fa/request/ \
  -H "Content-Type: application/json" \
  -d '{"email": "admin1@example.com"}'
```

### 2. Verify Code & Get JWT
```bash
curl -X POST http://localhost:8000/api/auth/2fa/verify/ \
  -H "Content-Type: application/json" \
  -d '{"email": "admin1@example.com", "token": "123456"}'
```

### 3. Use Access Token
```bash
curl -X GET http://localhost:8000/api/devices/ \
  -H "Authorization: Bearer <access_token>"
```

---

## 📁 File Structure

```
Backend/
├── .env                          # Configuration
├── Core/
│   ├── settings.py              # Updated with Swagger & 2FA
│   ├── urls.py                  # Added OpenAPI endpoints
│   └── wsgi.py
├── airquality/
│   ├── models.py                # Added TwoFactorToken model
│   ├── views.py                 # Added 2FA views
│   ├── serializers.py           # Added 2FA serializers
│   ├── urls.py                  # Added 2FA endpoints
│   ├── admin.py                 # Updated admin
│   └── migrations/
│       └── 0002_*.py            # 2FA migration
├── manage.py
└── API_DOCUMENTATION.md         # Full API docs
```

---

## 🎯 Next Steps

### For Development:
1. Test all endpoints on Swagger UI
2. Verify email configuration
3. Check 2FA token generation
4. Test JWT token flow

### For Production:
1. Change DEBUG = False
2. Set SECRET_KEY to secure value
3. Configure PostgreSQL database
4. Enable HTTPS
5. Set ALLOWED_HOSTS properly
6. Configure email sending service
7. Set up monitoring & logging

---

## 🔑 Important Notes

### Email Configuration
- Using Gmail SMTP with app-specific password
- Ensure "Less secure app access" is enabled (or use OAuth)
- Update credentials if needed in `.env`

### 2FA Token Expiration
- Default: 10 minutes
- Change in `.env`: `TWO_FACTOR_TOKEN_EXPIRE_MINUTES`
- Tokens marked as used after verification

### JWT Token Lifetime
- Access: 60 minutes
- Refresh: 7 days
- Configure in `settings.py`: SIMPLE_JWT dictionary

---

## 📞 Troubleshooting

### Port Already in Use
```bash
# Kill existing process
lsof -i :8000 | grep LISTEN | awk '{print $2}' | xargs kill -9

# Or use different port
python manage.py runserver 0.0.0.0:8001
```

### Email Not Sending
- Check `.env` credentials
- Verify Gmail app-specific password
- Check internet connection
- Review Django logs

### 2FA Token Not Valid
- Token expired (10 min default)
- Max attempts exceeded (3 attempts)
- Token already used
- Creating new token required

### JWT Token Expired
- Use refresh token: `POST /api/token/refresh/`
- Request new 2FA code if needed

---

## 📚 API Documentation URLs

| Resource | URL |
|----------|-----|
| **Swagger UI** | http://localhost:8000/api/docs/ |
| **ReDoc** | http://localhost:8000/api/redoc/ |
| **OpenAPI Schema** | http://localhost:8000/api/schema/ |
| **Admin Panel** | http://localhost:8000/admin/ |
| **API Root** | http://localhost:8000/api/ |

---

## ✨ Professional Features Implemented

✅ OpenAPI 3.0 Documentation
✅ JWT Authentication with Token Refresh
✅ 2FA Email Verification
✅ Normalized Database Schema
✅ Data Validation & Constraints
✅ Admin Panel with Full CRUD
✅ Error Handling & Status Codes
✅ Pagination Support
✅ Timestamp Tracking
✅ User-specific Data Isolation

---

**Version:** 1.0 Production Ready
**Date:** April 16, 2026
**Status:** ✅ Fully Implemented
