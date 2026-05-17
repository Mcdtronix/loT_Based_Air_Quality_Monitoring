from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
import secrets
import string
import logging

logger = logging.getLogger(__name__)

class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    phone = models.CharField(max_length=15, blank=True)
    medical_condition = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    email_verified = models.BooleanField(default=False)
    two_factor_enabled = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.user.username}'s profile"

class TwoFactorToken(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='two_factor_tokens')
    token = models.CharField(max_length=6, unique=True)
    created_at = models.DateTimeField(default=timezone.now)
    expires_at = models.DateTimeField()
    attempts = models.IntegerField(default=0)
    is_used = models.BooleanField(default=False)
    session_token = models.CharField(max_length=255, unique=True, null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"2FA Token for {self.user.username}"

    @staticmethod
    def generate_token():
        """Generate a random 6-digit token."""
        return ''.join(secrets.choice(string.digits) for _ in range(6))

    def is_valid(self):
        """Check if token is still valid (not expired and not used)."""
        return timezone.now() < self.expires_at and not self.is_used

    def is_max_attempts_exceeded(self, max_attempts=3):
        """Check if max verification attempts exceeded."""
        return self.attempts >= max_attempts

class Device(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='devices')
    device_id = models.CharField(max_length=100, unique=True)
    device_name = models.CharField(max_length=100)
    is_online = models.BooleanField(default=True)
    last_updated = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['user', 'device_name'], name='unique_device_name_per_user'),
        ]

    def __str__(self):
        return f"{self.device_name} ({self.device_id})"

class SensorReading(models.Model):
    device = models.ForeignKey(Device, on_delete=models.CASCADE, related_name='readings')
    timestamp = models.DateTimeField(default=timezone.now)
    pm25 = models.FloatField(validators=[MinValueValidator(0)])
    pm10 = models.FloatField(validators=[MinValueValidator(0)])
    co2 = models.FloatField(validators=[MinValueValidator(0)])
    carbon_monoxide = models.FloatField(validators=[MinValueValidator(0)], default=0)
    nitrogen_oxide = models.FloatField(validators=[MinValueValidator(0)], default=0)
    humidity = models.FloatField(validators=[MinValueValidator(0), MaxValueValidator(100)])
    temperature = models.FloatField()  # Celsius, reasonable range -50 to 50
    dust = models.FloatField(validators=[MinValueValidator(0)], default=0)
    aqi = models.IntegerField(validators=[MinValueValidator(0), MaxValueValidator(500)], null=True, blank=True)  # Computed AQI

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['device', '-timestamp']),
        ]

    def __str__(self):
        return f"Reading for {self.device.device_name} at {self.timestamp}"

    def save(self, *args, **kwargs):
        # Compute AQI if not provided
        if self.aqi is None:
            self.aqi = self.compute_aqi()
        
        # Debug: Log sensor reading save
        logger.debug(f"[DB_SAVE] SensorReading - Device: {self.device.device_name} (ID: {self.device_id}), "
                    f"PM2.5: {self.pm25}, PM10: {self.pm10}, CO2: {self.co2}, AQI: {self.aqi}, "
                    f"Temperature: {self.temperature}°C, Humidity: {self.humidity}%, "
                    f"Timestamp: {self.timestamp}")
        super().save(*args, **kwargs)

    def compute_aqi(self):
        # Simplified AQI calculation using the highest pollutant sub-index.
        # CO is treated as ppm. Nitrogen oxide is treated as ppm NO2-equivalent.
        pm25_aqi = min(500, max(0, (self.pm25 / 35.4) * 100))
        pm10_aqi = min(500, max(0, (self.pm10 / 154) * 100))
        carbon_monoxide_aqi = min(500, max(0, (self.carbon_monoxide / 9.4) * 100))
        nitrogen_oxide_aqi = min(500, max(0, (self.nitrogen_oxide / 0.1) * 100))
        return int(max(pm25_aqi, pm10_aqi, carbon_monoxide_aqi, nitrogen_oxide_aqi))

class Alert(models.Model):
    ALERT_TYPES = [
        ('warning', 'Warning'),
        ('danger', 'Danger'),
        ('info', 'Info'),
    ]

    device = models.ForeignKey(Device, on_delete=models.CASCADE, related_name='alerts')
    timestamp = models.DateTimeField(default=timezone.now)
    alert_type = models.CharField(max_length=10, choices=ALERT_TYPES)
    message = models.TextField()
    aqi = models.IntegerField(validators=[MinValueValidator(0)])
    read = models.BooleanField(default=False)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.alert_type} alert for {self.device.device_name}"
