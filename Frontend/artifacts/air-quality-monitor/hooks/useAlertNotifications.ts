/**
 * Alert Notification Hook
 * =======================
 * 
 * Detects new alerts and triggers appropriate user notifications.
 * Handles notification routing, deduplication, and critical alert escalation.
 * 
 * Author: AQM Frontend Team
 * Version: 1.0.0
 */

import { useEffect, useRef } from 'react';
import type { Alert } from '@/context/DeviceContext';
import NotificationService from '@/services/notification.service';

interface AlertNotificationConfig {
  enableCriticalAlerts?: boolean;
  enableWarningAlerts?: boolean;
  enableInfoAlerts?: boolean;
  onAlertReceived?: (alert: Alert) => void;
}

/**
 * Hook to handle alert notifications with smart deduplication
 * 
 * Features:
 * - Detects new alerts vs existing ones
 * - Routes to appropriate notification channel based on type
 * - Prevents notification spam with deduplication
 * - Supports selective notification types
 * 
 * @param alerts - Array of alerts from DeviceContext
 * @param config - Configuration for notification behavior
 */
export const useAlertNotifications = (
  alerts: Alert[],
  config: AlertNotificationConfig = {}
) => {
  const {
    enableCriticalAlerts = true,
    enableWarningAlerts = true,
    enableInfoAlerts = true,
    onAlertReceived,
  } = config;

  const previousAlertsRef = useRef<Alert[]>([]);
  const notifiedAlertIdsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    // Find new alerts by comparing with previous state
    const newAlerts = alerts.filter(
      (alert) =>
        !previousAlertsRef.current.some((prevAlert) => prevAlert.id === alert.id)
    );

    // Process each new alert
    newAlerts.forEach((alert) => {
      // Skip if already notified about this alert
      if (notifiedAlertIdsRef.current.has(alert.id)) {
        return;
      }

      // Mark as notified
      notifiedAlertIdsRef.current.add(alert.id);

      // Extract device and convert alert_type to type
      const { type = alert.alert_type } = alert as Alert & { type?: string };

      // Call callback if provided
      if (onAlertReceived) {
        onAlertReceived(alert);
      }

      // Route to appropriate notification handler
      if (type === 'danger') {
        if (enableCriticalAlerts) {
          handleCriticalAlert(alert);
        }
      } else if (type === 'warning') {
        if (enableWarningAlerts) {
          handleWarningAlert(alert);
        }
      } else if (type === 'info') {
        if (enableInfoAlerts) {
          handleInfoAlert(alert);
        }
      }
    });

    // Update previous alerts ref
    previousAlertsRef.current = alerts;

    // Cleanup old notified IDs when alert count drops
    // (user marked alerts as read and removed from list)
    if (alerts.length < previousAlertsRef.current.length) {
      const currentAlertIds = new Set(alerts.map((a) => a.id));
      notifiedAlertIdsRef.current = new Set(
        Array.from(notifiedAlertIdsRef.current).filter((id) =>
          currentAlertIds.has(id)
        )
      );
    }
  }, [alerts, enableCriticalAlerts, enableWarningAlerts, enableInfoAlerts, onAlertReceived]);
};

/**
 * Handle critical alert (DANGER type)
 * - Shows persistent notification
 * - Triggers haptic feedback
 * - Plays alert sound
 * - Offers quick action button
 */
function handleCriticalAlert(alert: Alert) {
  console.log('[AlertNotification] Critical alert:', alert.message);

  NotificationService.critical(
    '🚨 Critical Air Quality Alert',
    alert.message,
    {
      label: 'View',
      onPress: () => {
        // Navigation to alerts tab handled by app router
        console.log('[AlertNotification] Critical alert action tapped');
      },
    }
  );
}

/**
 * Handle warning alert (WARNING type)
 * - Shows dismissible notification
 * - Triggers light haptic feedback
 * - Auto-dismisses after 3.5 seconds
 */
function handleWarningAlert(alert: Alert) {
  console.log('[AlertNotification] Warning alert:', alert.message);

  NotificationService.warning(
    '⚠️ Air Quality Warning',
    alert.message
  );
}

/**
 * Handle info alert (INFO type)
 * - Shows brief notification
 * - No haptic feedback
 * - Auto-dismisses after 2.5 seconds
 */
function handleInfoAlert(alert: Alert) {
  console.log('[AlertNotification] Info alert:', alert.message);

  NotificationService.info(
    'ℹ️ Air Quality Update',
    alert.message
  );
}

export default useAlertNotifications;
