/**
 * Toast Notification Component
 * =============================
 * 
 * Displays in-app toast notifications with animations, actions, and dismiss buttons.
 * Automatically manages notification lifecycle and visual presentation.
 * 
 * Author: AQM Frontend Team
 */

import React, { useEffect, useState } from 'react';
import { Animated, Dimensions, GestureResponderEvent, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { NotificationService, type ToastConfig } from '@/services/notification.service';
import { useColors } from '@/hooks/useColors';

const TOAST_HEIGHT = 72;
const ANIMATION_DURATION = 300;
const { width } = Dimensions.get('window');

/**
 * Toast notification component
 * Appears at top of screen with auto-dismiss capability
 */
export const Toast: React.FC = () => {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [notification, setNotification] = useState<ToastConfig | null>(null);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(-TOAST_HEIGHT - insets.top));

  useEffect(() => {
    const unsubscribe = NotificationService.subscribe((notif) => {
      setNotification(notif);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (notification) {
      // Animate in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: insets.top + 8,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Animate out
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -TOAST_HEIGHT - insets.top,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [notification, fadeAnim, slideAnim, insets.top]);

  if (!notification) return null;

  const getToastStyle = () => {
    const baseColors = {
      success: { bg: colors.success, fg: colors.background, border: colors.success },
      error: { bg: colors.destructive, fg: colors.background, border: colors.destructive },
      warning: { bg: colors.warning, fg: colors.background, border: colors.warning },
      info: { bg: colors.primary, fg: colors.background, border: colors.primary },
      critical: { bg: colors.destructive, fg: colors.background, border: colors.destructive },
    };
    return baseColors[notification.type] || baseColors.info;
  };

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return 'check-circle';
      case 'error':
        return 'x-circle';
      case 'warning':
        return 'alert-triangle';
      case 'critical':
        return 'alert-octagon';
      default:
        return 'info';
    }
  };

  const toastStyle = getToastStyle();

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
          paddingTop: insets.top,
        },
      ]}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => NotificationService.dismiss(notification.id)}
        style={[
          styles.toast,
          {
            backgroundColor: toastStyle.bg,
            borderColor: toastStyle.border,
          },
        ]}
      >
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Feather
            name={getIcon()}
            size={20}
            color={toastStyle.fg}
            style={styles.icon}
          />
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text
            style={[
              styles.title,
              {
                color: toastStyle.fg,
              },
            ]}
            numberOfLines={1}
          >
            {notification.title}
          </Text>
          <Text
            style={[
              styles.message,
              {
                color: toastStyle.fg,
                opacity: 0.9,
              },
            ]}
            numberOfLines={1}
          >
            {notification.message}
          </Text>
        </View>

        {/* Action Button */}
        {notification.action && (
          <TouchableOpacity
            onPress={(e: GestureResponderEvent) => {
              e.stopPropagation();
              notification.action?.onPress();
              NotificationService.dismiss(notification.id);
            }}
            style={[
              styles.actionBtn,
              {
                backgroundColor: `${toastStyle.fg}20`,
              },
            ]}
          >
            <Text
              style={[
                styles.actionText,
                {
                  color: toastStyle.fg,
                },
              ]}
            >
              {notification.action.label}
            </Text>
          </TouchableOpacity>
        )}

        {/* Close Button */}
        <TouchableOpacity
          onPress={() => NotificationService.dismiss(notification.id)}
          style={styles.closeBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather
            name="x"
            size={18}
            color={toastStyle.fg}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingHorizontal: 12,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    gap: 10,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.9,
  },
  icon: {
    fontWeight: '600',
  },
  content: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    lineHeight: 16,
  },
  message: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 14,
  },
  actionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginHorizontal: 4,
  },
  actionText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  closeBtn: {
    padding: 4,
    marginLeft: 4,
  },
});

export default Toast;
