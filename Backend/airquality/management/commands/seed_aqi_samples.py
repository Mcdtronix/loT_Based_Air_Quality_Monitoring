from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.utils import timezone
import logging

from airquality.models import Alert, Device, Profile, SensorReading

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Seed sample AQI data for one good reading, one bad reading, and an alert."

    def handle(self, *args, **options):
        now = timezone.now()

        user, created = User.objects.get_or_create(
            username="sample@airquality.local",
            defaults={
                "email": "sample@airquality.local",
                "first_name": "Sample",
                "last_name": "User",
            },
        )
        if created:
            user.set_password("SamplePass123!")
            user.save()
            logger.debug(f"[DB_SAVE] User (Seed) - Username: {user.username}, Email: {user.email}")
        else:
            logger.debug(f"[DB_GET] User (Seed) - Username: {user.username} already exists")

        profile, profile_created = Profile.objects.get_or_create(
            user=user,
            defaults={
                "phone": "+263771000000",
                "medical_condition": "Asthma",
                "email_verified": True,
                "two_factor_enabled": False,
            },
        )
        if profile_created:
            logger.debug(f"[DB_SAVE] Profile (Seed) - User: {user.username} (ID: {user.id}), "
                        f"Phone: +263771000000, Medical Condition: Asthma")
        else:
            logger.debug(f"[DB_GET] Profile (Seed) - User: {user.username} already has profile")

        good_device, good_created = Device.objects.get_or_create(
            device_id="AQM-GOOD-001",
            defaults={
                "user": user,
                "device_name": "Office Monitor - Good AQI",
                "is_online": True,
                "last_updated": now,
            },
        )
        if good_device.user_id != user.id:
            good_device.user = user
        good_device.device_name = "Office Monitor - Good AQI"
        good_device.is_online = True
        good_device.last_updated = now
        good_device.save()
        logger.debug(f"[DB_SAVE] Device (Seed - Good) - Device ID: AQM-GOOD-001, Name: Office Monitor - Good AQI, "
                    f"User: {user.username} (ID: {user.id}), is_online: True")

        bad_device, bad_created = Device.objects.get_or_create(
            device_id="AQM-BAD-001",
            defaults={
                "user": user,
                "device_name": "Workshop Monitor - Bad AQI",
                "is_online": True,
                "last_updated": now,
            },
        )
        if bad_device.user_id != user.id:
            bad_device.user = user
        bad_device.device_name = "Workshop Monitor - Bad AQI"
        bad_device.is_online = True
        bad_device.last_updated = now
        bad_device.save()
        logger.debug(f"[DB_SAVE] Device (Seed - Bad) - Device ID: AQM-BAD-001, Name: Workshop Monitor - Bad AQI, "
                    f"User: {user.username} (ID: {user.id}), is_online: True")

        good_reading, good_reading_created = SensorReading.objects.update_or_create(
            device=good_device,
            timestamp=now.replace(minute=0, second=0, microsecond=0),
            defaults={
                "pm25": 10.0,
                "pm10": 20.0,
                "co2": 420.0,
                "carbon_monoxide": 1.2,
                "nitrogen_oxide": 0.02,
                "humidity": 45.0,
                "temperature": 23.5,
                "dust": 8.0,
                "aqi": None,
            },
        )
        logger.debug(f"[DB_SAVE] SensorReading (Seed - Good) - Device: {good_device.device_name} (ID: {good_device.id}), "
                    f"PM2.5: 10.0, PM10: 20.0, CO2: 420.0, AQI: {good_reading.aqi}, Temp: 23.5°C")

        bad_reading, bad_reading_created = SensorReading.objects.update_or_create(
            device=bad_device,
            timestamp=now.replace(minute=5, second=0, microsecond=0),
            defaults={
                "pm25": 100.0,
                "pm10": 250.0,
                "co2": 1400.0,
                "carbon_monoxide": 14.0,
                "nitrogen_oxide": 0.18,
                "humidity": 72.0,
                "temperature": 31.0,
                "dust": 65.0,
                "aqi": None,
            },
        )
        logger.debug(f"[DB_SAVE] SensorReading (Seed - Bad) - Device: {bad_device.device_name} (ID: {bad_device.id}), "
                    f"PM2.5: 100.0, PM10: 250.0, CO2: 1400.0, AQI: {bad_reading.aqi}, Temp: 31.0°C")

        alert, alert_created = Alert.objects.update_or_create(
            device=bad_device,
            timestamp=bad_reading.timestamp,
            defaults={
                "alert_type": "danger",
                "message": (
                    "Hazardous air quality detected. Limit outdoor activity and "
                    "wear protective equipment if exposure is unavoidable."
                ),
                "aqi": bad_reading.compute_aqi(),
                "read": False,
            },
        )
        logger.debug(f"[DB_SAVE] Alert (Seed) - Device: {bad_device.device_name} (ID: {bad_device.id}), "
                    f"Alert Type: danger, AQI: {alert.aqi}, read: False")

        self.stdout.write(self.style.SUCCESS("Sample AQI data created successfully."))
        self.stdout.write(
            f"User: {user.username} | Password: SamplePass123!"
        )
        self.stdout.write(
            f"Good reading -> Device: {good_device.device_name}, AQI: {good_reading.aqi}"
        )
        self.stdout.write(
            f"Bad reading -> Device: {bad_device.device_name}, AQI: {bad_reading.aqi}"
        )
        self.stdout.write(
            f"Alert -> Type: {alert.alert_type}, AQI: {alert.aqi}, Read: {alert.read}"
        )
