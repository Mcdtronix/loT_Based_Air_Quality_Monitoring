/**
 * Notification Preferences Hook
 * =============================
 * 
 * Manages user preferences for notifications.
 * Stores preferences in AsyncStorage for persistence.
 * 
 * Author: AQM Frontend Team
 */

import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface NotificationPreferences {
  enableCriticalAlerts: boolean;
  enableWarningAlerts: boolean;
  enableInfoAlerts: boolean;
  enableSound: boolean;
  enableHaptics: boolean;
  enablePushNotifications: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  enableCriticalAlerts: true,
  enableWarningAlerts: true,
  enableInfoAlerts: true,
  enableSound: true,
  enableHaptics: true,
  enablePushNotifications: true,
};

const STORAGE_KEY = '@aqm_notification_preferences';

/**
 * Hook to manage notification preferences
 */
export const useNotificationPreferences = () => {
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);

  // Load preferences from storage
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          setPreferences(JSON.parse(stored));
        }
      } catch (error) {
        console.error('[NotificationPreferences] Failed to load:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPreferences();
  }, []);

  // Update preference
  const updatePreference = useCallback(
    async <K extends keyof NotificationPreferences>(
      key: K,
      value: NotificationPreferences[K]
    ) => {
      try {
        const updated = { ...preferences, [key]: value };
        setPreferences(updated);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error('[NotificationPreferences] Failed to update:', error);
        // Revert on failure
        setPreferences((prev) => ({ ...prev, [key]: preferences[key] }));
      }
    },
    [preferences]
  );

  // Update multiple preferences at once
  const updatePreferences = useCallback(
    async (updates: Partial<NotificationPreferences>) => {
      try {
        const updated = { ...preferences, ...updates };
        setPreferences(updated);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error('[NotificationPreferences] Failed to update multiple:', error);
        // Revert on failure
        setPreferences((prev) => ({ ...prev, ...updates }));
      }
    },
    [preferences]
  );

  // Reset to defaults
  const resetToDefaults = useCallback(async () => {
    try {
      setPreferences(DEFAULT_PREFERENCES);
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('[NotificationPreferences] Failed to reset:', error);
    }
  }, []);

  return {
    preferences,
    isLoading,
    updatePreference,
    updatePreferences,
    resetToDefaults,
  };
};

export default useNotificationPreferences;
