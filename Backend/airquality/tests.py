from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from .models import Device, SensorReading
from .serializers import DeviceSerializer


class SensorReadingAqiTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='owner', password='pass')
        self.device = Device.objects.create(
            user=self.user,
            device_id='AQI-001',
            device_name='AQI Test Device',
        )

    def make_reading(self, **overrides):
        values = {
            'device': self.device,
            'pm25': 5,
            'pm10': 10,
            'co2': 420,
            'carbon_monoxide': 0,
            'nitrogen_oxide': 0,
            'humidity': 45,
            'temperature': 23,
            'dust': 0,
        }
        values.update(overrides)
        return SensorReading(**values)

    def test_carbon_monoxide_is_included_in_aqi(self):
        reading = self.make_reading(carbon_monoxide=18.8)

        self.assertEqual(reading.compute_aqi(), 200)

    def test_nitrogen_oxide_is_included_in_aqi(self):
        reading = self.make_reading(nitrogen_oxide=0.2)

        self.assertEqual(reading.compute_aqi(), 200)


class DeviceNameIdentificationTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='owner', password='pass')
        self.device = Device.objects.create(
            user=self.user,
            device_id='AQ-ROOM-001',
            device_name='Living Room Sensor',
        )
        self.client = APIClient()

    def test_device_name_must_be_unique_per_user(self):
        serializer = DeviceSerializer(
            data={
                'device_id': 'AQ-ROOM-002',
                'device_name': 'Living Room Sensor',
            },
            context={'request': type('Request', (), {'user': self.user})()},
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn('device_name', serializer.errors)

    def test_module_upload_uses_registered_device_name_without_authentication(self):
        response = self.client.post(
            '/api/readings/upload/',
            {
                'device_name': 'Living Room Sensor',
                'pm25': 12.5,
                'pm10': 25.0,
                'co2': 430.0,
                'carbon_monoxide': 1.0,
                'nitrogen_oxide': 0.02,
                'humidity': 55.0,
                'temperature': 24.0,
                'dust': 7.0,
            },
            format='json',
        )

        self.assertEqual(response.status_code, 201)
        reading = SensorReading.objects.get()
        self.assertEqual(reading.device, self.device)
        self.device.refresh_from_db()
        self.assertTrue(self.device.is_online)
        self.assertEqual(self.device.last_updated, reading.timestamp)

    def test_module_upload_replaces_latest_device_reading(self):
        first_response = self.client.post(
            '/api/readings/upload/',
            {
                'device_name': 'Living Room Sensor',
                'pm25': 12.5,
                'pm10': 25.0,
                'co2': 430.0,
                'carbon_monoxide': 1.0,
                'nitrogen_oxide': 0.02,
                'humidity': 55.0,
                'temperature': 24.0,
                'dust': 7.0,
            },
            format='json',
        )
        second_response = self.client.post(
            '/api/readings/upload/',
            {
                'device_name': 'Living Room Sensor',
                'pm25': 42.0,
                'pm10': 84.0,
                'co2': 520.0,
                'carbon_monoxide': 3.5,
                'nitrogen_oxide': 0.05,
                'humidity': 61.0,
                'temperature': 26.0,
                'dust': 10.0,
            },
            format='json',
        )

        self.assertEqual(first_response.status_code, 201)
        self.assertEqual(second_response.status_code, 200)
        self.assertEqual(SensorReading.objects.count(), 1)

        reading = SensorReading.objects.get()
        self.assertEqual(reading.device, self.device)
        self.assertEqual(reading.pm25, 42.0)
        self.assertEqual(reading.pm10, 84.0)
        self.assertEqual(reading.co2, 520.0)
        self.assertEqual(reading.carbon_monoxide, 3.5)
        self.assertEqual(reading.nitrogen_oxide, 0.05)
        self.assertEqual(reading.humidity, 61.0)
        self.assertEqual(reading.temperature, 26.0)
        self.assertEqual(reading.dust, 10.0)

    def test_module_upload_reports_unknown_device_name(self):
        response = self.client.post(
            '/api/readings/upload/',
            {
                'device_name': 'Unknown Sensor',
                'pm25': 12.5,
                'pm10': 25.0,
                'co2': 430.0,
                'carbon_monoxide': 1.0,
                'nitrogen_oxide': 0.02,
                'humidity': 55.0,
                'temperature': 24.0,
                'dust': 7.0,
            },
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn('Unknown Sensor', response.data['device_name'])
