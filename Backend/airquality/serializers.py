from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from rest_framework import serializers
import logging

from .models import Alert, Device, Profile, SensorReading, TwoFactorToken
from django.conf import settings

logger = logging.getLogger(__name__)

class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'full_name']

    def get_full_name(self, obj):
        full_name = obj.get_full_name().strip()
        return full_name or obj.username

class ProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = Profile
        fields = ['user', 'phone', 'medical_condition', 'created_at', 'email_verified', 'two_factor_enabled']

class DeviceSerializer(serializers.ModelSerializer):
    status = serializers.SerializerMethodField()
    last_reading = serializers.SerializerMethodField()

    class Meta:
        model = Device
        fields = [
            'id',
            'device_id',
            'device_name',
            'is_online',
            'status',
            'last_updated',
            'created_at',
            'last_reading',
        ]
        read_only_fields = ['id', 'created_at']

    def get_status(self, obj):
        return 'online' if obj.is_online else 'offline'

    def get_last_reading(self, obj):
        latest = obj.readings.order_by('-timestamp').first()
        if latest is None:
            return None
        return {
            'aqi': latest.aqi,
            'timestamp': latest.timestamp,
        }

    def validate_device_name(self, value):
        normalized = value.strip()
        if not normalized:
            raise serializers.ValidationError("Device name is required.")

        request = self.context.get('request')
        if request and request.user.is_authenticated:
            queryset = Device.objects.filter(user=request.user, device_name__iexact=normalized)
            if self.instance:
                queryset = queryset.exclude(pk=self.instance.pk)
            if queryset.exists():
                raise serializers.ValidationError(
                    "You already have a device with this name. Use the exact unique name stored in the module code."
                )
        return normalized

    def validate_device_id(self, value):
        normalized = value.strip()
        if not normalized:
            raise serializers.ValidationError("Device ID is required.")
        return normalized

class SensorReadingSerializer(serializers.ModelSerializer):
    dust_density = serializers.FloatField(source='dust', required=False)

    class Meta:
        model = SensorReading
        fields = [
            'id',
            'device',
            'timestamp',
            'pm25',
            'pm10',
            'co2',
            'carbon_monoxide',
            'nitrogen_oxide',
            'humidity',
            'temperature',
            'dust',
            'dust_density',
            'aqi',
        ]
        read_only_fields = ['id', 'timestamp', 'aqi']


class ModuleSensorReadingSerializer(SensorReadingSerializer):
    device_name = serializers.CharField(write_only=True)

    class Meta(SensorReadingSerializer.Meta):
        fields = SensorReadingSerializer.Meta.fields + ['device_name']
        read_only_fields = SensorReadingSerializer.Meta.read_only_fields + ['device']

class AlertSerializer(serializers.ModelSerializer):
    type = serializers.CharField(source='alert_type', read_only=True)
    title = serializers.SerializerMethodField()

    class Meta:
        model = Alert
        fields = ['id', 'device', 'timestamp', 'alert_type', 'type', 'title', 'message', 'aqi', 'read']
        read_only_fields = ['id', 'timestamp']

    def get_title(self, obj):
        label = obj.get_alert_type_display()
        return f'{label} air quality alert'

class RegisterSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    phone = serializers.CharField(max_length=15)
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True, min_length=8)
    medical_condition = serializers.CharField(max_length=255)

    def validate_email(self, value):
        normalized = value.strip().lower()
        if User.objects.filter(email__iexact=normalized).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return normalized

    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        return data

    def create(self, validated_data):
        full_name = validated_data.pop('full_name').strip()
        validated_data.pop('confirm_password')
        password = validated_data.pop('password')
        phone = validated_data.pop('phone')
        medical_condition = validated_data.pop('medical_condition')

        first_name, _, last_name = full_name.partition(' ')
        email = validated_data['email']

        user = User.objects.create_user(
            username=email,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name.strip(),
        )
        logger.debug(f"[DB_SAVE] User (Registration) - Username: {user.username}, Email: {user.email}, "
                    f"Name: {user.first_name} {user.last_name}")
        
        profile = Profile.objects.create(
            user=user,
            phone=phone,
            medical_condition=medical_condition,
            email_verified=False,
            two_factor_enabled=True,
        )
        logger.debug(f"[DB_SAVE] Profile (Registration) - User: {user.username} (ID: {user.id}), "
                    f"Phone: {phone}, Medical Condition: {medical_condition}, email_verified: False")
        return user

class LoginRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate(self, data):
        email = data['email'].strip().lower()
        password = data['password']

        user = authenticate(username=email, password=password)
        if user is None:
            raise serializers.ValidationError({"email": "Invalid email or password."})

        profile = Profile.objects.get_or_create(user=user)[0]
        if not profile.email_verified:
            raise serializers.ValidationError(
                {"email": "Please verify your email address before logging in."}
            )

        data['user'] = user
        data['email'] = email
        return data

class TwoFactorRequestSerializer(serializers.Serializer):
    """Serializer for requesting 2FA token."""
    email = serializers.EmailField()
    
    def validate_email(self, value):
        try:
            user = User.objects.get(email=value)
        except User.DoesNotExist:
            raise serializers.ValidationError("User with this email does not exist.")
        return user

class TwoFactorVerifySerializer(serializers.Serializer):
    """Serializer for verifying 2FA token."""
    email = serializers.EmailField()
    token = serializers.CharField(max_length=6, min_length=6)
    
    def validate(self, data):
        try:
            user = User.objects.get(email=data['email'])
        except User.DoesNotExist:
            raise serializers.ValidationError({"email": "User not found."})
        
        # Get the latest 2FA token for this user
        try:
            two_factor_token = TwoFactorToken.objects.filter(
                user=user, 
                is_used=False
            ).latest('created_at')
        except TwoFactorToken.DoesNotExist:
            raise serializers.ValidationError({"token": "No valid 2FA token found. Request a new one."})
        
        # Check if token is expired
        if not two_factor_token.is_valid():
            raise serializers.ValidationError({"token": "2FA token has expired."})
        
        # Check if max attempts exceeded
        if two_factor_token.is_max_attempts_exceeded(settings.TWO_FACTOR_MAX_ATTEMPTS):
            raise serializers.ValidationError({"token": "Maximum verification attempts exceeded. Request a new token."})
        
        # Check if token matches
        if two_factor_token.token != data['token']:
            two_factor_token.attempts += 1
            two_factor_token.save()
            raise serializers.ValidationError({"token": "Invalid 2FA token."})
        
        data['user'] = user
        data['two_factor_token'] = two_factor_token
        return data
