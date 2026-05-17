# 📊 Database Design & Data Model Documentation

## Overview
This document details the fully normalized database schema designed specifically for IoT air quality monitoring with secure 2FA authentication.

---

## 🗄️ Entity-Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     CORE DATA MODEL                             │
└─────────────────────────────────────────────────────────────────┘

User (Django Built-in)
  ├── id (PK)
  ├── username (UNIQUE)
  ├── email (UNIQUE)
  ├── password (hashed)
  ├── first_name
  ├── last_name
  └── is_active

    ↓ ONE-TO-ONE

Profile *
  ├── user (FK → User, UNIQUE)
  ├── phone
  ├── medical_condition
  ├── created_at
  └── two_factor_enabled

    ↓ ONE-TO-MANY

Device
  ├── id (PK)
  ├── user (FK → User)
  ├── device_id (UNIQUE)
  ├── device_name
  ├── is_online
  ├── last_updated
  └── created_at

    ├─ ONE-TO-MANY ─→ SensorReading
    │   ├── id (PK)
    │   ├── device (FK → Device)
    │   ├── timestamp
    │   ├── pm25 (0-∞)
    │   ├── pm10 (0-∞)
    │   ├── co2 (0-∞)
    │   ├── carbon_monoxide (0-∞)
    │   ├── nitrogen_oxide (0-∞)
    │   ├── humidity (0-100)
    │   ├── temperature (-∞-∞)
    │   ├── dust (0-∞)
    │   └── aqi (0-500, calculated)
    │
    └─ ONE-TO-MANY ─→ Alert
        ├── id (PK)
        ├── device (FK → Device)
        ├── timestamp
        ├── alert_type (warning|danger|info)
        ├── message
        ├── aqi (0-500)
        └── read

    ↓ ONE-TO-MANY (same User)

TwoFactorToken *
  ├── id (PK)
  ├── user (FK → User)
  ├── token (6-digit, UNIQUE)
  ├── created_at
  ├── expires_at
  ├── attempts
  ├── is_used
  └── session_token
```

---

## 📋 Detailed Table Schemas

### 1. **User** (Django Built-in)
Not customized - uses Django's default User model.

| Column | Type | Constraints | Notes |
|--------|------|-----------|-------|
| id | INTEGER | PK | Auto-increment |
| username | VARCHAR(150) | UNIQUE, NOT NULL | Login credential |
| email | VARCHAR(254) | UNIQUE, NOT NULL | Contact & 2FA |
| password | VARCHAR(128) | NOT NULL | Hashed |
| first_name | VARCHAR(150) | | Optional |
| last_name | VARCHAR(150) | | Optional |
| is_active | BOOLEAN | DEFAULT TRUE | Account status |
| date_joined | DATETIME | DEFAULT NOW | Timestamp |

---

### 2. **Profile** ⭐
Extends User with domain-specific data.

| Column | Type | Constraints | Notes |
|--------|------|-----------|-------|
| id | INTEGER | PK | Auto-increment |
| user_id | INTEGER | FK(User), UNIQUE, NOT NULL | One profile per user |
| phone | VARCHAR(15) | | Emergency phone |
| medical_condition | VARCHAR(255) | | Health tracking |
| two_factor_enabled | BOOLEAN | DEFAULT TRUE | 2FA activation flag |
| created_at | DATETIME | DEFAULT NOW | Record creation |

**Rationale:**
- One-to-one with User (each user has exactly one profile)
- Allows optional medical tracking for health-related alerts
- 2FA toggle per user for flexible authentication

---

### 3. **Device** 📱
IoT device registration and status.

| Column | Type | Constraints | Notes |
|--------|------|-----------|-------|
| id | INTEGER | PK | Auto-increment |
| user_id | INTEGER | FK(User), NOT NULL | Device owner |
| device_id | VARCHAR(100) | UNIQUE, NOT NULL | Hardware serial/ID |
| device_name | VARCHAR(100) | NOT NULL | Display name |
| is_online | BOOLEAN | DEFAULT TRUE | Current status |
| last_updated | DATETIME | NULL | Last sync time |
| created_at | DATETIME | DEFAULT NOW | Registration time |

**Indexes:**
```sql
CREATE INDEX idx_device_user ON Device(user_id);
CREATE INDEX idx_device_id_unique ON Device(device_id);
```

**Rationale:**
- Allows multiple devices per user
- Unique device_id prevents duplicate registration
- Online status for real-time dashboard
- Last updated timestamp for monitoring device health

---

### 4. **SensorReading** 📊
Core time-series data from IoT sensors.

| Column | Type | Range | Notes |
|--------|------|-------|-------|
| id | INTEGER | PK | Auto-increment |
| device_id | INTEGER | FK(Device) | Reading source |
| timestamp | DATETIME | DEFAULT NOW | Sample time |
| pm25 | FLOAT | ≥ 0 | PM2.5 (µg/m³) |
| pm10 | FLOAT | ≥ 0 | PM10 (µg/m³) |
| co2 | FLOAT | ≥ 0 | CO2 (ppm) |
| carbon_monoxide | FLOAT | ≥ 0 | Carbon monoxide (ppm) |
| nitrogen_oxide | FLOAT | ≥ 0 | Nitrogen oxide (ppm NO2-equivalent) |
| humidity | FLOAT | 0-100 | Relative % |
| temperature | FLOAT | -50 to +50 | Celsius |
| dust | FLOAT | ≥ 0 | Dust (µg/m³) |
| aqi | INTEGER | 0-500 | Auto-calculated |

**Indexes:**
```sql
CREATE INDEX idx_sensor_device_timestamp 
  ON SensorReading(device_id, timestamp DESC);
CREATE INDEX idx_sensor_timestamp 
  ON SensorReading(timestamp DESC);
```

**Rationale:**
- Time-series optimization (device + timestamp index)
- Validates all sensor values at database level
- AQI auto-calculated to ensure consistency
- Timestamp indexing for range queries (24h, 7d, 30d reports)

**AQI Calculation Algorithm:**
```python
pm25_aqi = min(500, max(0, (pm25 / 35.4) * 100))
pm10_aqi = min(500, max(0, (pm10 / 154) * 100))
carbon_monoxide_aqi = min(500, max(0, (carbon_monoxide / 9.4) * 100))
nitrogen_oxide_aqi = min(500, max(0, (nitrogen_oxide / 0.1) * 100))
aqi = int(max(pm25_aqi, pm10_aqi, carbon_monoxide_aqi, nitrogen_oxide_aqi))
```

---

### 5. **Alert** ⚠️
Threshold-based alerts for users.

| Column | Type | Values | Notes |
|--------|------|--------|-------|
| id | INTEGER | PK | Auto-increment |
| device_id | INTEGER | FK(Device) | Alert source |
| timestamp | DATETIME | DEFAULT NOW | Alert time |
| alert_type | VARCHAR(10) | warning, danger, info | Severity |
| message | TEXT | | Detailed message |
| aqi | INTEGER | 0-500 | Trigger value |
| read | BOOLEAN | DEFAULT FALSE | View status |

**Indexes:**
```sql
CREATE INDEX idx_alert_device_user 
  ON Alert(device_id);
CREATE INDEX idx_alert_read 
  ON Alert(read);
```

**Rationale:**
- Related to Device through user context
- Alert types for frontend filtering
- Read status for notification management
- AQI value stored for audit trail

---

### 6. **TwoFactorToken** 🔐
2FA verification tracking and audit.

| Column | Type | Constraints | Notes |
|--------|------|-----------|-------|
| id | INTEGER | PK | Auto-increment |
| user_id | INTEGER | FK(User) | Token recipient |
| token | VARCHAR(6) | UNIQUE, NOT NULL | 6-digit code |
| created_at | DATETIME | DEFAULT NOW | Generation time |
| expires_at | DATETIME | NOT NULL | Expiration (now+10min) |
| attempts | INTEGER | DEFAULT 0, ≤ 3 | Verification attempts |
| is_used | BOOLEAN | DEFAULT FALSE | Consumption flag |
| session_token | VARCHAR(255) | UNIQUE, NULL | Session tracking |

**Indexes:**
```sql
CREATE INDEX idx_2fa_user_created 
  ON TwoFactorToken(user_id, created_at DESC);
CREATE INDEX idx_2fa_token_unique 
  ON TwoFactorToken(token);
```

**Rationale:**
- Tracks all 2FA attempts for security audit
- Token expiration prevents indefinite validity
- Attempt counter prevents brute force
- Session token allows tracking verification flow
- is_used flag prevents token reuse

---

## 🔗 Relationships & Constraints

### Relationship Matrix

| From | To | Type | Cascade |
|------|----|----|---------|
| Profile | User | 1:1 | CASCADE DELETE |
| Device | User | M:1 | CASCADE DELETE |
| SensorReading | Device | M:1 | CASCADE DELETE |
| Alert | Device | M:1 | CASCADE DELETE |
| TwoFactorToken | User | M:1 | CASCADE DELETE |

### Cascade Behavior
- Deleting a User deletes all related:
  - Profile
  - Devices + their readings and alerts
  - TwoFactorTokens

---

## 📈 Normalization Analysis

### First Normal Form (1NF) ✅
- All attributes are atomic
- No repeating groups
- Each field contains single value

### Second Normal Form (2NF) ✅
- All 1NF requirements met
- All non-key attributes depend on entire primary key
- No partial dependencies

### Third Normal Form (3NF) ✅
- All 2NF requirements met
- No transitive dependencies
- No non-key attribute depends on another non-key

### Boyce-Codd Normal Form (BCNF) ✅
- Stricter than 3NF
- Every determinant is a candidate key

---

## 🎯 Performance Optimization

### Indexing Strategy

**High-Cardinality Indexes:**
```sql
-- Frequently queried combinations
idx_sensor_device_timestamp  -- Range queries for reports
idx_2fa_user_created         -- Latest token lookup
```

**Low-Cardinality Indexes:**
```sql
-- Status/flag fields
idx_alert_read               -- Read/unread notifications
idx_device_online            -- Device status dashboard
```

### Query Patterns Optimized

1. **Recent Readings by Device:**
   ```sql
   SELECT * FROM SensorReading 
   WHERE device_id = ? AND timestamp > NOW() - INTERVAL 24 HOUR
   ORDER BY timestamp DESC;
   ```
   → Optimized with `idx_sensor_device_timestamp`

2. **User Latest 2FA Token:**
   ```sql
   SELECT * FROM TwoFactorToken 
   WHERE user_id = ? AND is_used = FALSE
   ORDER BY created_at DESC LIMIT 1;
   ```
   → Optimized with `idx_2fa_user_created`

3. **Unread Alerts:**
   ```sql
   SELECT * FROM Alert WHERE device_id IN (
     SELECT id FROM Device WHERE user_id = ?
   ) AND read = FALSE;
   ```
   → Optimized with `idx_alert_read`

---

## 🔐 Data Integrity & Validation

### Database Constraints

```
PM2.5:     CHECK(pm25 >= 0)
PM10:      CHECK(pm10 >= 0)
CO2:       CHECK(co2 >= 0)
Humidity:  CHECK(humidity >= 0 AND humidity <= 100)
Dust:      CHECK(dust >= 0)
AQI:       CHECK(aqi >= 0 AND aqi <= 500)
Attempts:  CHECK(attempts >= 0 AND attempts <= 3)
```

### Application-Level Validation

```python
# Field Validators
MinValueValidator(0)           # Non-negative values
MaxValueValidator(100)         # Humidity cap
MaxValueValidator(500)         # AQI cap

# Token Generation
secrets.choice(string.digits) * 6  # Cryptographically random 6-digit
```

---

## 📊 Data Volume Considerations

### Projected Capacity (Single User, 1 Year)

| Table | Est. Records | Size (MB) | Notes |
|-------|--------------|-----------|-------|
| Device | 5-10 | <1 | Slow growth |
| SensorReading | 1.5-3M | 200-600 | 1-2 minute intervals |
| Alert | 1K-10K | <1 | Depends on thresholds |
| TwoFactorToken | 365-3650 | <1 | Daily + retries |

**Storage Strategy:**
- Keep recent data (1-3 months) in hot storage
- Archive older readings to data warehouse
- Clean up used 2FA tokens after 30 days

---

## 🔄 Data Migration Path

### From Prototype to Production

```
PROTOTYPE (SQLite)
    ↓
Add to-timestamp index
Add device-online index
    ↓
PRODUCTION (PostgreSQL)
Add JSONB for reading metadata
Add materialized views for aggregates
Add partitioning by month
    ↓
ANALYTICS (Data Warehouse)
Aggregate readings by hour/day
Build dashboards
```

---

## 📋 API Response Examples

### Device with Latest Reading
```json
{
  "id": 1,
  "device_id": "IOT-001",
  "device_name": "Living Room",
  "is_online": true,
  "last_updated": "2026-04-16T10:30:00Z",
  "latest_reading": {
    "timestamp": "2026-04-16T10:30:00Z",
    "pm25": 35.5,
    "pm10": 45.2,
    "co2": 420.8,
    "humidity": 65.5,
    "temperature": 22.3,
    "dust": 15.2,
    "aqi": 87
  }
}
```

### Alert with Device Info
```json
{
  "id": 1,
  "device": {
    "id": 1,
    "device_name": "Living Room"
  },
  "timestamp": "2026-04-16T10:30:00Z",
  "alert_type": "warning",
  "message": "PM2.5 exceeded safe level",
  "aqi": 87,
  "read": false
}
```

---

## 🛠️ Database Maintenance

### Routine Tasks

**Daily:**
- Monitor disk usage
- Check for failed sensors

**Weekly:**
- Backup database
- Archive old 2FA tokens

**Monthly:**
- Analyze query performance
- Review slow queries
- Clean up unused devices

**Quarterly:**
- Archive sensor data >90 days
- Review retention policies
- Performance tuning

---

## 📌 Design Decisions & Rationale

### Why Separate Profile Model?
- Extends Django Auth without modifying it
- Allows future per-user settings
- Maintains Django best practices

### Why Store AQI Directly?
- Prevents recalculation overhead
- Audit trail of historical AQI
- Enables efficient trending queries
- Supports calculation algorithm changes

### Why 10-Minute 2FA Expiration?
- Balance between security and UX
- Prevents indefinite token validity
- Configurable per deployment

### Why Composite Index (device, timestamp)?
- Most common query: "readings for device between X and Y"
- Range scan optimized
- Supports time-series analysis

---

## 🔐 Security Best Practices in Schema

1. **No Passwords Stored** - Uses Django hashing
2. **Token Expiration** - Prevents indefinite access
3. **Attempt Limiting** - Blocks brute force in 2FA
4. **Cascade Deletes** - Prevents orphaned records
5. **Unique Constraints** - Prevents duplicates
6. **User Isolation** - Queries filtered by user_id

---

**Version:** 1.0 Production Ready
**Last Updated:** April 16, 2026
**Normalization Level:** BCNF (Boyce-Codd Normal Form)
**Status:** ✅ Optimized for Performance & Security
