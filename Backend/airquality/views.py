import secrets
import logging

from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone
from rest_framework import generics, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from datetime import timedelta

logger = logging.getLogger(__name__)

from .models import Device, SensorReading, Alert, Profile, TwoFactorToken
from .serializers import (
    AlertSerializer,
    DeviceSerializer,
    LoginRequestSerializer,
    ProfileSerializer,
    RegisterSerializer,
    ModuleSensorReadingSerializer,
    SensorReadingSerializer,
    TwoFactorRequestSerializer,
    TwoFactorVerifySerializer,
)
from .alert_service import AlertService


def build_auth_user_payload(user):
    profile = Profile.objects.get_or_create(user=user)[0]
    return {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'full_name': user.get_full_name().strip() or user.username,
        'phone': profile.phone,
        'medical_condition': profile.medical_condition,
        'created_at': profile.created_at,
        'email_verified': profile.email_verified,
    }


def issue_two_factor_token(user):
    Profile.objects.get_or_create(user=user)
    logger.debug(f"[DB_SAVE] Profile - User: {user.username} (ID: {user.id}) - get_or_create")
    
    TwoFactorToken.objects.filter(user=user, is_used=False).update(is_used=True)
    logger.debug(f"[DB_UPDATE] TwoFactorToken - Marked unused tokens as used for User: {user.username} (ID: {user.id})")

    token = TwoFactorToken.generate_token()
    expires_at = timezone.now() + timedelta(minutes=settings.TWO_FACTOR_TOKEN_EXPIRE_MINUTES)
    session_token = secrets.token_urlsafe(24)

    two_factor_token = TwoFactorToken.objects.create(
        user=user,
        token=token,
        expires_at=expires_at,
        session_token=session_token,
    )
    logger.debug(f"[DB_SAVE] TwoFactorToken - User: {user.username} (ID: {user.id}), "
                f"Token: {token}, Expires: {expires_at}")

    subject = 'Your AirGuard verification code'
    message = f"""
    Hello {user.first_name or user.username},

    Your verification code is: {token}

    This code will expire in {settings.TWO_FACTOR_TOKEN_EXPIRE_MINUTES} minutes.

    If you did not request this code, please ignore this email.

    Best regards,
    AirGuard Team
    """

    send_mail(
        subject,
        message,
        settings.DEFAULT_FROM_EMAIL,
        [user.email],
        fail_silently=False,
    )
    return two_factor_token


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(_request):
    return Response({'status': 'ok'})

class ProfileViewSet(viewsets.ModelViewSet):
    serializer_class = ProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Profile.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        profile = serializer.save(user=self.request.user)
        logger.debug(f"[DB_SAVE] Profile - User: {self.request.user.username} (ID: {self.request.user.id}), "
                    f"Phone: {profile.phone}, Medical Condition: {profile.medical_condition}")

class DeviceViewSet(viewsets.ModelViewSet):
    serializer_class = DeviceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Device.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        device = serializer.save(user=self.request.user)
        logger.debug(f"[DB_SAVE] Device - User: {self.request.user.username} (ID: {self.request.user.id}), "
                    f"Device Name: {device.device_name}, Device ID: {device.device_id}")

class SensorReadingViewSet(viewsets.ModelViewSet):
    serializer_class = SensorReadingSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action == 'upload':
            return [AllowAny()]
        return super().get_permissions()

    def get_queryset(self):
        device_id = self.request.query_params.get('device')
        if device_id:
            return SensorReading.objects.filter(device__user=self.request.user, device__id=device_id)
        return SensorReading.objects.filter(device__user=self.request.user)

    def perform_create(self, serializer):
        device = serializer.validated_data['device']
        if device.user_id != self.request.user.id:
            raise ValidationError({'device': 'You do not have access to this device.'})
        reading = serializer.save()
        logger.debug(f"[DB_SAVE] SensorReading - Device: {device.device_name} (ID: {device.id}), "
                    f"PM2.5: {reading.pm25}, PM10: {reading.pm10}, AQI: {reading.aqi}")

    @action(detail=False, methods=['post'], authentication_classes=[], permission_classes=[AllowAny])
    def upload(self, request):
        # For IoT devices to upload data by the registered module name.
        serializer = ModuleSensorReadingSerializer(data=request.data, context=self.get_serializer_context())
        serializer.is_valid(raise_exception=True)
        device_name = serializer.validated_data.pop('device_name').strip()
        matching_devices = Device.objects.filter(device_name=device_name)

        if not matching_devices.exists():
            return Response(
                {
                    'device_name': (
                        f'No registered device matches "{device_name}". '
                        'Register this exact name in the application or update the Arduino device_name value.'
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if matching_devices.count() > 1:
            return Response(
                {'device_name': 'Multiple devices match this name. Rename devices so module device names are globally unique.'},
                status=status.HTTP_409_CONFLICT,
            )

        device = matching_devices.get()
        latest_reading = device.readings.order_by('-timestamp').first()

        if latest_reading is None:
            reading = serializer.save(device=device)
            logger.debug(f"[DB_SAVE] SensorReading (IoT Upload - New) - Device: {device.device_name} (ID: {device.id}), "
                        f"PM2.5: {reading.pm25}, PM10: {reading.pm10}, AQI: {reading.aqi}")
            response_status = status.HTTP_201_CREATED
        else:
            for field, value in serializer.validated_data.items():
                setattr(latest_reading, field, value)
            latest_reading.timestamp = timezone.now()
            latest_reading.aqi = None
            latest_reading.save()
            logger.debug(f"[DB_SAVE] SensorReading (IoT Upload - Update) - Device: {device.device_name} (ID: {device.id}), "
                        f"PM2.5: {latest_reading.pm25}, PM10: {latest_reading.pm10}, AQI: {latest_reading.aqi}")
            reading = latest_reading
            response_status = status.HTTP_200_OK

        device.is_online = True
        device.last_updated = reading.timestamp
        device.save(update_fields=['is_online', 'last_updated'])
        logger.debug(f"[DB_UPDATE] Device - Device: {device.device_name} (ID: {device.id}), "
                    f"is_online: {device.is_online}, last_updated: {device.last_updated}")

        # ✅ Generate alert if air quality degraded
        try:
            alert = AlertService.process_reading(reading)
            if alert:
                logger.info(f"[ALERT] Alert triggered for {device.device_name}: {alert.message}")
            else:
                logger.debug(f"[ALERT] No alert generated for {device.device_name} (AQI: {reading.aqi})")
        except Exception as e:
            logger.error(f"[ALERT_ERROR] Failed to process alert for {device.device_name}: {str(e)}", exc_info=True)

        return Response(SensorReadingSerializer(reading).data, status=response_status)

class AlertViewSet(viewsets.ModelViewSet):
    serializer_class = AlertSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Alert.objects.filter(device__user=self.request.user)

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        alert = self.get_object()
        alert.read = True
        alert.save()
        logger.debug(f"[DB_UPDATE] Alert - Alert ID: {alert.id}, Device: {alert.device.device_name} (ID: {alert.device.id}), "
                    f"read: {alert.read}, Alert Type: {alert.alert_type}, Message: {alert.message[:50]}...")
        return Response({'status': 'alert marked as read'})

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        count = Alert.objects.filter(device__user=request.user, read=False).count()
        Alert.objects.filter(device__user=request.user, read=False).update(read=True)
        logger.debug(f"[DB_UPDATE] Alert (Bulk) - Marked {count} alerts as read for User: {request.user.username} (ID: {request.user.id})")
        return Response({'status': 'all alerts marked as read'})

class Request2FAView(generics.GenericAPIView):
    """Request a 2FA token to be sent via email."""
    permission_classes = [AllowAny]
    serializer_class = TwoFactorRequestSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data['email']

        # Check if 2FA is enabled for this user
        profile = Profile.objects.get_or_create(user=user)[0]
        if not profile.two_factor_enabled:
            return Response(
                {'message': '2FA is not enabled for this account.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            two_factor_token = issue_two_factor_token(user)
            return Response(
                {
                    'message': 'A verification code has been sent to your email.',
                    'session_token': two_factor_token.session_token,
                },
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {'error': f'Failed to send email: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class Verify2FAView(generics.GenericAPIView):
    """Verify 2FA token and return JWT tokens."""
    permission_classes = [AllowAny]
    serializer_class = TwoFactorVerifySerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = serializer.validated_data['user']
        two_factor_token = serializer.validated_data['two_factor_token']
        profile = Profile.objects.get_or_create(user=user)[0]
        
        # Mark token as used
        two_factor_token.is_used = True
        two_factor_token.save()
        logger.debug(f"[DB_UPDATE] TwoFactorToken - Token: {two_factor_token.token}, User: {user.username} (ID: {user.id}), is_used: True")
        
        if not profile.email_verified:
            profile.email_verified = True
            profile.save(update_fields=['email_verified'])
            logger.debug(f"[DB_UPDATE] Profile - User: {user.username} (ID: {user.id}), email_verified: True")
        
        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        
        return Response(
            {
                'message': '2FA verification successful.',
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'user': build_auth_user_payload(user),
            },
            status=status.HTTP_200_OK
        )


class RegisterView(generics.GenericAPIView):
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        try:
            two_factor_token = issue_two_factor_token(user)
        except Exception as exc:
            user.delete()
            return Response(
                {'error': f'Failed to send email: {str(exc)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            {
                'message': 'Account created. A verification code has been sent to your email.',
                'session_token': two_factor_token.session_token,
                'email': user.email,
            },
            status=status.HTTP_201_CREATED,
        )


class LoginRequestView(generics.GenericAPIView):
    permission_classes = [AllowAny]
    serializer_class = LoginRequestSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        refresh = RefreshToken.for_user(user)

        return Response(
            {
                'message': 'Login successful.',
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'user': build_auth_user_payload(user),
            },
            status=status.HTTP_200_OK,
        )
