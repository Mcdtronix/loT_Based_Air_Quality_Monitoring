/**
 * Notification Service
 * ====================
 * 
 * Manages in-app notifications, push notifications, haptic feedback, and alerts.
 * Provides unified notification delivery across the application.
 * 
 * Features:
 * - Toast notifications (temporary in-app alerts)
 * - Push notifications (persistent background alerts)
 * - Haptic feedback (vibration patterns)
 * - Sound alerts (critical alert sounds)
 * - Notification queuing (prevents notification spam)
 * 
 * Author: AQM Frontend Team
 * Version: 1.0.0
 */

import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';

export interface ToastConfig {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'critical';
  title: string;
  message: string;
  duration?: number; // ms (0 = indefinite)
  action?: {
    label: string;
    onPress: () => void;
  };
  haptics?: boolean;
  sound?: boolean;
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string | number | boolean>;
  sound?: 'default' | 'critical' | 'none';
  badge?: number;
}

/**
 * Toast notification configuration
 */
export const TOAST_DEFAULTS = {
  SUCCESS: {
    duration: 2500,
    haptics: false,
    sound: false,
  },
  ERROR: {
    duration: 4000,
    haptics: true,
    sound: false,
  },
  WARNING: {
    duration: 3500,
    haptics: false,
    sound: false,
  },
  INFO: {
    duration: 2500,
    haptics: false,
    sound: false,
  },
  CRITICAL: {
    duration: 0, // Indefinite until dismissed
    haptics: true,
    sound: true,
  },
};

/**
 * Haptic feedback patterns
 */
export const HapticPatterns = {
  // Light tap for info/success
  Light: () =>
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),

  // Medium vibration for warnings
  Medium: () =>
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),

  // Heavy impact for critical alerts
  Heavy: () =>
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),

  // Success pattern
  Success: async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  },

  // Warning pattern
  Warning: async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  },

  // Error pattern: double vibration
  Error: async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  },

  // Critical pattern: repeated pulses
  Critical: async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      await new Promise((resolve) => setTimeout(resolve, 150));
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      await new Promise((resolve) => setTimeout(resolve, 150));
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (e) {
      console.warn('[Haptics] Critical pattern failed:', e);
    }
  },

  // Selection feedback
  Selection: () =>
    Haptics.selectionAsync(),
};

/**
 * Sound alert system
 */
export class AlertSoundManager {
  private static sounds: Record<string, Audio.Sound | null> = {
    warning: null,
    critical: null,
  };

  private static isInitialized = false;

  /**
   * Initialize audio system and preload sounds
   */
  static async initialize() {
    if (this.isInitialized) return;

    try {
      // Set audio mode with simple safe defaults
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      this.isInitialized = true;
      console.log('[AlertSoundManager] Audio system initialized');
    } catch (error) {
      console.error('[AlertSoundManager] Initialization failed:', error);
      // Set as initialized anyway so notifications still work
      this.isInitialized = true;
    }
  }

  /**
   * Play warning alert sound
   */
  static async playWarningSound() {
    try {
      // Using a simple beep pattern (can be replaced with actual audio files)
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
      });

      const sound = new Audio.Sound();
      await sound.loadAsync(require('../../assets/sounds/warning.mp3'));
      await sound.playAsync();

      // Auto-cleanup
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (error) {
      console.warn('[AlertSoundManager] Warning sound playback failed:', error);
    }
  }

  /**
   * Play critical alert sound (urgent)
   */
  static async playCriticalSound() {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
      });

      const sound = new Audio.Sound();
      await sound.loadAsync(require('../../assets/sounds/critical-alert.mp3'));
      await sound.setVolumeAsync(1.0); // Max volume
      await sound.playAsync();

      // Auto-cleanup
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (error) {
      console.warn('[AlertSoundManager] Critical sound playback failed:', error);
    }
  }

  /**
   * Stop all playing sounds
   */
  static async stopAll() {
    try {
      for (const sound of Object.values(this.sounds)) {
        if (sound) {
          await sound.stopAsync();
          await sound.unloadAsync();
        }
      }
    } catch (error) {
      console.error('[AlertSoundManager] Stop failed:', error);
    }
  }
}

/**
 * Notification Service - Main class
 */
export class NotificationService {
  private static notificationQueue: ToastConfig[] = [];
  private static notificationTimers: Map<string, NodeJS.Timeout> = new Map();
  private static currentNotification: ToastConfig | null = null;
  private static listeners: Array<(notification: ToastConfig | null) => void> = [];
  private static isProcessing = false;

  /**
   * Initialize notification system
   */
  static initialize() {
    AlertSoundManager.initialize();
    console.log('[NotificationService] Initialized');
  }

  /**
   * Subscribe to notification updates
   */
  static subscribe(callback: (notification: ToastConfig | null) => void): () => void {
    this.listeners.push(callback);

    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  /**
   * Notify all subscribers of notification changes
   */
  private static notifyListeners() {
    this.listeners.forEach((callback) => {
      callback(this.currentNotification);
    });
  }

  /**
   * Process notification queue
   */
  private static async processQueue() {
    if (this.isProcessing || this.notificationQueue.length === 0) return;

    this.isProcessing = true;
    const notification = this.notificationQueue.shift()!;

    this.currentNotification = notification;
    this.notifyListeners();

    // Apply haptics
    if (notification.haptics) {
      try {
        if (notification.type === 'critical') {
          await HapticPatterns.Critical();
        } else if (notification.type === 'error') {
          await HapticPatterns.Error();
        } else if (notification.type === 'warning') {
          await HapticPatterns.Warning();
        } else {
          await HapticPatterns.Light();
        }
      } catch (error) {
        console.warn('[NotificationService] Haptics failed:', error);
      }
    }

    // Play sound
    if (notification.sound) {
      try {
        if (notification.type === 'critical') {
          await AlertSoundManager.playCriticalSound();
        } else if (notification.type === 'warning') {
          await AlertSoundManager.playWarningSound();
        }
      } catch (error) {
        console.warn('[NotificationService] Sound playback failed:', error);
      }
    }

    // Schedule auto-dismiss
    if (notification.duration && notification.duration > 0) {
      const timer = setTimeout(() => {
        this.dismiss(notification.id);
      }, notification.duration);

      this.notificationTimers.set(notification.id, timer);
    }

    this.isProcessing = false;
    
    // Process next in queue
    if (this.notificationQueue.length > 0) {
      setImmediate(() => this.processQueue());
    }
  }

  /**
   * Show a toast notification
   */
  static show(config: Omit<ToastConfig, 'id'>) {
    const id = `notification-${Date.now()}-${Math.random()}`;
    
    // Normalize type to uppercase for TOAST_DEFAULTS lookup
    const typeKey = (config.type || 'info').toUpperCase() as keyof typeof TOAST_DEFAULTS;

    const fullConfig: ToastConfig = {
      ...config,
      id,
      duration: config.duration ?? TOAST_DEFAULTS[typeKey]?.duration ?? 2500,
      haptics: config.haptics ?? TOAST_DEFAULTS[typeKey]?.haptics ?? false,
      sound: config.sound ?? TOAST_DEFAULTS[typeKey]?.sound ?? false,
    };

    this.notificationQueue.push(fullConfig);
    this.processQueue();

    return id;
  }

  /**
   * Show success notification
   */
  static success(title: string, message: string) {
    return this.show({
      type: 'success',
      title,
      message,
    });
  }

  /**
   * Show error notification
   */
  static error(title: string, message: string) {
    return this.show({
      type: 'error',
      title,
      message,
    });
  }

  /**
   * Show warning notification
   */
  static warning(title: string, message: string) {
    return this.show({
      type: 'warning',
      title,
      message,
      haptics: true,
    });
  }

  /**
   * Show info notification
   */
  static info(title: string, message: string) {
    return this.show({
      type: 'info',
      title,
      message,
    });
  }

  /**
   * Show critical alert notification
   */
  static critical(
    title: string,
    message: string,
    action?: { label: string; onPress: () => void }
  ) {
    return this.show({
      type: 'critical',
      title,
      message,
      action,
      duration: 0, // Indefinite
      haptics: true,
      sound: true,
    });
  }

  /**
   * Dismiss a specific notification
   */
  static dismiss(id: string) {
    if (this.currentNotification?.id === id) {
      // Clear timer
      const timer = this.notificationTimers.get(id);
      if (timer) {
        clearTimeout(timer);
        this.notificationTimers.delete(id);
      }

      this.currentNotification = null;
      this.notifyListeners();

      // Process next in queue
      this.isProcessing = false;
      this.processQueue();
    } else {
      // Remove from queue
      this.notificationQueue = this.notificationQueue.filter((n) => n.id !== id);
    }
  }

  /**
   * Dismiss all notifications
   */
  static dismissAll() {
    this.notificationTimers.forEach((timer) => clearTimeout(timer));
    this.notificationTimers.clear();
    this.notificationQueue = [];
    this.currentNotification = null;
    this.isProcessing = false;
    this.notifyListeners();
  }

  /**
   * Get current notification
   */
  static getCurrent(): ToastConfig | null {
    return this.currentNotification;
  }

  /**
   * Get queue size
   */
  static getQueueSize(): number {
    return this.notificationQueue.length;
  }
}

export default NotificationService;
