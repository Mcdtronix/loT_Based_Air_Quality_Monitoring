"""
Air Quality Alert Service
==========================

Provides intelligent alert generation based on AQI thresholds and air quality trends.
Implements alert suppression logic to prevent spam and provides historical tracking.

Author: AQM Team
Version: 1.0.0
"""

import logging
from datetime import timedelta
from django.utils import timezone
from django.db.models import Q

from .models import Alert, SensorReading

logger = logging.getLogger(__name__)


class AQIThreshold:
    """Air Quality Index (AQI) threshold boundaries and metadata."""
    
    # AQI Levels according to EPA standards
    GOOD = 50              # Green: AQI 0-50
    MODERATE = 100         # Yellow: AQI 51-100
    USG = 150              # Orange: AQI 101-150 (Unhealthy for Sensitive Groups)
    UNHEALTHY = 200        # Red: AQI 151-200
    VERY_UNHEALTHY = 300   # Purple: AQI 201-300
    HAZARDOUS = float('inf')  # Maroon: AQI > 300
    
    LEVELS = [
        (GOOD, "Good", "success"),
        (MODERATE, "Moderate", "warning"),
        (USG, "Unhealthy for Sensitive Groups", "warning"),
        (UNHEALTHY, "Unhealthy", "danger"),
        (VERY_UNHEALTHY, "Very Unhealthy", "danger"),
        (HAZARDOUS, "Hazardous", "danger"),
    ]


class AlertService:
    """
    Manages alert generation and delivery for air quality events.
    
    Alert Types:
    - info: Neutral informational alerts
    - warning: Moderate air quality concerns (affects sensitive groups)
    - danger: Severe air quality conditions (affects general population)
    """
    
    # Alert suppression window (prevent duplicate alerts)
    ALERT_SUPPRESSION_MINUTES = 30
    
    # Stability threshold: require 2+ readings at new level before alerting
    READINGS_BEFORE_ALERT = 2
    
    @staticmethod
    def get_aqi_level(aqi: int) -> tuple[str, str]:
        """
        Map AQI value to level description and severity type.
        
        Args:
            aqi: Air Quality Index value (0-500+)
            
        Returns:
            Tuple of (level_name: str, alert_type: str)
        """
        for threshold, level_name, alert_type in AQIThreshold.LEVELS:
            if aqi <= threshold:
                return level_name, alert_type
        return "Hazardous", "danger"
    
    @staticmethod
    def should_suppress_alert(device, alert_type: str) -> bool:
        """
        Determine if alert should be suppressed to prevent spam.
        
        Suppression Rules:
        - Same alert type within ALERT_SUPPRESSION_MINUTES = suppress
        - Different alert type = always trigger
        - First alert ever = always trigger
        
        Args:
            device: Device object
            alert_type: Alert type to check ('warning', 'danger', 'info')
            
        Returns:
            True if alert should be suppressed, False otherwise
        """
        cutoff_time = timezone.now() - timedelta(minutes=AlertService.ALERT_SUPPRESSION_MINUTES)
        
        recent_alert = Alert.objects.filter(
            device=device,
            alert_type=alert_type,
            timestamp__gte=cutoff_time,
            read=False  # Only suppress unread alerts
        ).order_by('-timestamp').first()
        
        if recent_alert:
            logger.info(
                f"[ALERT] Suppressing {alert_type} alert for {device.device_name} "
                f"(Device ID: {device.id}) — recent alert at {recent_alert.timestamp}"
            )
            return True
        
        return False
    
    @staticmethod
    def should_alert_on_trend_change(device, current_aqi: int, previous_aqi: int) -> bool:
        """
        Determine if alert should trigger based on AQI trend change.
        
        Rules:
        - Good → Moderate or worse = WARN
        - Moderate/USG → Unhealthy or worse = ALERT
        - Unhealthy → Very Unhealthy or Hazardous = ALERT
        - Improvement (e.g., Unhealthy → Moderate) = INFO (low priority)
        
        Args:
            device: Device object
            current_aqi: Latest AQI reading
            previous_aqi: Previous AQI reading
            
        Returns:
            Tuple (should_alert: bool, alert_type: str, reason: str)
        """
        current_level, current_severity = AlertService.get_aqi_level(current_aqi)
        previous_level, previous_severity = AlertService.get_aqi_level(previous_aqi)
        
        # No change in level = no alert
        if current_level == previous_level:
            return False, None, None
        
        # Degradation (worse air quality)
        if current_aqi > previous_aqi:
            # Significant degradation (>30 points)
            if current_aqi - previous_aqi > 30:
                return True, "danger", f"Rapid degradation: {previous_level} → {current_level}"
            # Moderate degradation
            return True, "warning", f"Air quality worsened: {previous_level} → {current_level}"
        
        # Improvement (better air quality)
        else:
            # Significant improvement (>40 points)
            if previous_aqi - current_aqi > 40:
                return True, "info", f"Air quality improved: {previous_level} → {current_level}"
        
        return False, None, None
    
    @staticmethod
    def create_alert(device, alert_type: str, message: str, aqi: int) -> Alert:
        """
        Create and persist an alert to the database.
        
        Args:
            device: Device object
            alert_type: Type of alert ('warning', 'danger', 'info')
            message: Human-readable alert message
            aqi: AQI value when alert was triggered
            
        Returns:
            Created Alert object
        """
        alert = Alert.objects.create(
            device=device,
            alert_type=alert_type,
            message=message,
            aqi=aqi,
            read=False,
            timestamp=timezone.now()
        )
        
        logger.warning(
            f"[ALERT] Created {alert_type} alert for {device.device_name} "
            f"(Device ID: {device.id}, User: {device.user.username}) — "
            f"AQI: {aqi}, Message: {message}"
        )
        
        return alert
    
    @staticmethod
    def process_reading(reading: SensorReading) -> Alert or None:
        """
        Main entry point: Process a sensor reading and generate alerts if necessary.
        
        Alert Generation Logic:
        1. Check if alert should be suppressed
        2. Compare with previous reading for trend
        3. Check AQI thresholds
        4. Create alert if conditions met
        
        Args:
            reading: SensorReading object (must be saved to DB)
            
        Returns:
            Created Alert object if alert generated, None otherwise
        """
        try:
            device = reading.device
            current_aqi = reading.aqi
            
            # Log the starting point
            logger.info(
                f"[ALERT_DEBUG] Processing reading for {device.device_name} "
                f"(Device ID: {device.id}) — Current AQI: {current_aqi}"
            )
            
            # Get previous reading for trend analysis
            previous_reading = SensorReading.objects.filter(
                device=device,
                timestamp__lt=reading.timestamp
            ).order_by('-timestamp').first()
            
            previous_aqi = previous_reading.aqi if previous_reading else current_aqi
            
            logger.info(
                f"[ALERT_DEBUG] Previous AQI: {previous_aqi}, "
                f"Previous reading exists: {previous_reading is not None}"
            )
            
            # Determine if trend warrants alert
            should_alert, alert_type, reason = AlertService.should_alert_on_trend_change(
                device, current_aqi, previous_aqi
            )
            
            logger.info(
                f"[ALERT_DEBUG] Trend check — should_alert: {should_alert}, "
                f"type: {alert_type}, reason: {reason}"
            )
            
            # For first reading, also alert if AQI is already at unhealthy levels
            if not should_alert and not previous_reading and current_aqi >= 150:
                # Generate initial warning for already-unhealthy air
                current_level, _ = AlertService.get_aqi_level(current_aqi)
                should_alert = True
                alert_type = "warning" if current_aqi < 200 else "danger"
                reason = f"Initial reading: {current_level}"
                logger.info(
                    f"[ALERT_DEBUG] First reading with high AQI — "
                    f"Triggering {alert_type} alert"
                )
            
            if not should_alert:
                logger.debug(
                    f"[ALERT] No alert needed for {device.device_name} — "
                    f"AQI: {current_aqi}, Trend stable"
                )
                return None
            
            # Check if alert should be suppressed
            if AlertService.should_suppress_alert(device, alert_type):
                logger.info(
                    f"[ALERT_DEBUG] Alert suppressed for {device.device_name} — "
                    f"Type: {alert_type}, Reason: Recent alert within suppression window"
                )
                return None
            
            # Construct detailed alert message
            aqi_level, _ = AlertService.get_aqi_level(current_aqi)
            message = f"{reason} (AQI: {previous_aqi} → {current_aqi}, Level: {aqi_level})"
            
            logger.info(
                f"[ALERT_DEBUG] Creating {alert_type} alert — Message: {message}"
            )
            
            # Create and persist alert
            alert = AlertService.create_alert(device, alert_type, message, current_aqi)
            return alert
            
        except Exception as e:
            logger.error(
                f"[ALERT_ERROR] Exception in process_reading: {str(e)}", 
                exc_info=True
            )
            return None
        
        return alert
    
    @staticmethod
    def cleanup_old_alerts(days_to_keep: int = 30) -> int:
        """
        Clean up read alerts older than specified days.
        
        Args:
            days_to_keep: Number of days to retain alerts (default 30)
            
        Returns:
            Number of alerts deleted
        """
        cutoff_date = timezone.now() - timedelta(days=days_to_keep)
        
        deleted_count, _ = Alert.objects.filter(
            read=True,
            timestamp__lt=cutoff_date
        ).delete()
        
        if deleted_count > 0:
            logger.info(f"[CLEANUP] Deleted {deleted_count} old alerts (>30 days old)")
        
        return deleted_count
    
    @staticmethod
    def get_critical_alerts(device, limit: int = 10) -> list:
        """
        Retrieve critical unread alerts for a device.
        
        Args:
            device: Device object
            limit: Maximum number of alerts to return
            
        Returns:
            List of Alert objects, ordered by severity and recency
        """
        return Alert.objects.filter(
            device=device,
            read=False
        ).filter(
            Q(alert_type='danger') | Q(alert_type='warning')
        ).order_by('-timestamp')[:limit]


class BulkAlertProcessor:
    """Batch process multiple readings for alert generation."""
    
    @staticmethod
    def process_batch(readings: list) -> dict:
        """
        Process multiple readings and collect alerts.
        
        Args:
            readings: List of SensorReading objects
            
        Returns:
            Dictionary with stats: {'total': int, 'alerted': int, 'suppressed': int}
        """
        stats = {'total': len(readings), 'alerted': 0, 'suppressed': 0}
        
        for reading in readings:
            alert = AlertService.process_reading(reading)
            if alert:
                stats['alerted'] += 1
        
        logger.info(f"[BULK_ALERT] Processed {stats['total']} readings, "
                   f"generated {stats['alerted']} alerts")
        
        return stats
