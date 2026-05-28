/**
 * Alert Service — Frontend
 * ==========================
 * 
 * Manages alert polling, filtering, sorting, and real-time updates.
 * Provides intelligent grouping and historical tracking of air quality alerts.
 * 
 * Author: AQM Frontend Team
 * Version: 1.0.0
 */

import type { Alert } from '../services/api.service';

export interface AlertStats {
  total: number;
  unread: number;
  critical: number; // danger alerts
  warnings: number;
  resolved: number;
}

export interface AlertFilter {
  alertType?: 'all' | 'danger' | 'warning' | 'info';
  readStatus?: 'all' | 'read' | 'unread';
  deviceId?: number;
  timeRange?: 'today' | 'week' | 'month' | 'all';
}

export interface AlertGroup {
  device: string;
  deviceId: number;
  alerts: Alert[];
  severity: 'critical' | 'warning' | 'info';
}

/**
 * Calculate statistics from alerts array
 */
export const calculateAlertStats = (alerts: Alert[]): AlertStats => {
  return {
    total: alerts.length,
    unread: alerts.filter((a) => !a.read).length,
    critical: alerts.filter((a) => a.type === 'danger').length,
    warnings: alerts.filter((a) => a.type === 'warning').length,
    resolved: alerts.filter((a) => a.read).length,
  };
};

/**
 * Filter alerts based on criteria
 */
export const filterAlerts = (alerts: Alert[], filter: AlertFilter): Alert[] => {
  let filtered = alerts;

  // Filter by alert type
  if (filter.alertType && filter.alertType !== 'all') {
    filtered = filtered.filter((a) => a.type === filter.alertType);
  }

  // Filter by read status
  if (filter.readStatus === 'unread') {
    filtered = filtered.filter((a) => !a.read);
  } else if (filter.readStatus === 'read') {
    filtered = filtered.filter((a) => a.read);
  }

  // Filter by device
  if (filter.deviceId) {
    filtered = filtered.filter((a) => a.device === filter.deviceId);
  }

  // Filter by time range
  if (filter.timeRange && filter.timeRange !== 'all') {
    const now = new Date();
    let startDate: Date;

    switch (filter.timeRange) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        return filtered;
    }

    filtered = filtered.filter((a) => new Date(a.timestamp) >= startDate);
  }

  return filtered;
};

/**
 * Sort alerts by relevance and time
 * Priority: unread danger > unread warning > read danger > older alerts
 */
export const sortAlerts = (alerts: Alert[]): Alert[] => {
  return [...alerts].sort((a, b) => {
    // Unread comes before read
    if (a.read !== b.read) {
      return a.read ? 1 : -1;
    }

    // Danger comes before warning
    if (a.type !== b.type) {
      const severity = { danger: 0, warning: 1, info: 2 };
      return (severity[a.type as keyof typeof severity] || 3) - (severity[b.type as keyof typeof severity] || 3);
    }

    // More recent first
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });
};

/**
 * Group alerts by device
 */
export const groupAlertsByDevice = (
  alerts: Alert[],
  deviceNames: Map<number, string>,
): AlertGroup[] => {
  const groups = new Map<number, Alert[]>();

  for (const alert of alerts) {
    const deviceId = alert.device;
    if (!groups.has(deviceId)) {
      groups.set(deviceId, []);
    }
    groups.get(deviceId)!.push(alert);
  }

  return Array.from(groups.entries()).map(([deviceId, deviceAlerts]) => {
    const severity = deviceAlerts.some((a) => a.type === 'danger')
      ? 'critical'
      : deviceAlerts.some((a) => a.type === 'warning')
        ? 'warning'
        : 'info';

    return {
      device: deviceNames.get(deviceId) || `Device ${deviceId}`,
      deviceId,
      alerts: sortAlerts(deviceAlerts),
      severity,
    };
  });
};

/**
 * Get alert color based on type
 */
export const getAlertColor = (
  alertType: string,
  colors: any,
): string => {
  switch (alertType) {
    case 'danger':
      return colors.destructive;
    case 'warning':
      return colors.warning;
    case 'info':
    default:
      return colors.primary;
  }
};

/**
 * Get alert icon name based on type
 */
export const getAlertIcon = (alertType: string): string => {
  switch (alertType) {
    case 'danger':
      return 'alert-octagon';
    case 'warning':
      return 'alert-triangle';
    case 'info':
    default:
      return 'info';
  }
};

/**
 * Format alert timestamp for display
 */
export const formatAlertTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Check if alert is critical (requires immediate attention)
 */
export const isCriticalAlert = (alert: Alert): boolean => {
  return alert.type === 'danger' && !alert.read;
};

/**
 * Get recommended action based on alert type
 */
export const getAlertAction = (alertType: string): string => {
  switch (alertType) {
    case 'danger':
      return 'Check your device immediately. AQI has reached hazardous levels.';
    case 'warning':
      return 'Monitor air quality. Sensitive groups should take precautions.';
    case 'info':
      return 'Air quality has improved. You can dismiss this alert.';
    default:
      return 'View details for more information.';
  }
};

/**
 * Batch mark alerts as read after a delay
 * Prevents excessive API calls
 */
export const debounceMarkAlertRead = (
  alertId: number,
  onMarkRead: (id: number) => void,
  delay: number = 500,
): NodeJS.Timeout => {
  return setTimeout(() => {
    onMarkRead(alertId);
  }, delay);
};
