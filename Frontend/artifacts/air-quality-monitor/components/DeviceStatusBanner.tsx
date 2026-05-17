import * as Haptics from "expo-haptics";
import React, { useEffect, useRef } from "react";
import { Animated, Platform, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useDevice } from "@/context/DeviceContext";

export function DeviceStatusBanner() {
  const colors = useColors();
  const { isDeviceOnline, deviceName, deviceId, lastUpdated } = useDevice();
  const pulse = useRef(new Animated.Value(1)).current;
  const previousOnlineState = useRef<boolean | null>(null);

  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;

    if (isDeviceOnline) {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1.4,
            duration: 900,
            useNativeDriver: Platform.OS !== "web",
          }),
          Animated.timing(pulse, {
            toValue: 1,
            duration: 900,
            useNativeDriver: Platform.OS !== "web",
          }),
        ])
      );
      animation.start();
    } else if (previousOnlineState.current === true && Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }

    previousOnlineState.current = isDeviceOnline;

    return () => {
      animation?.stop();
    };
  }, [isDeviceOnline, pulse]);

  const bgColor = isDeviceOnline ? `${colors.success}15` : `${colors.destructive}15`;
  const dotColor = isDeviceOnline ? colors.success : colors.destructive;
  const statusText = isDeviceOnline ? "Online" : "Offline";

  return (
    <View style={[styles.banner, { backgroundColor: bgColor, borderColor: `${dotColor}40` }]}>
      <View style={styles.left}>
        <View style={styles.dotWrap}>
          <Animated.View
            style={[styles.dotPulse, { backgroundColor: dotColor, opacity: 0.3, transform: [{ scale: pulse }] }]}
          />
          <View style={[styles.dot, { backgroundColor: dotColor }]} />
        </View>
        <View>
          <Text style={[styles.deviceName, { color: colors.foreground }]}>{deviceName}</Text>
          <Text style={[styles.deviceId, { color: colors.mutedForeground }]}>ID: {deviceId}</Text>
        </View>
      </View>
      <View style={styles.right}>
        <Text style={[styles.statusText, { color: dotColor }]}>{statusText}</Text>
        {isDeviceOnline && lastUpdated ? (
          <Text style={[styles.updatedText, { color: colors.mutedForeground }]}>
            Updated {lastUpdated}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dotWrap: {
    width: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    position: "absolute",
  },
  dotPulse: {
    width: 16,
    height: 16,
    borderRadius: 8,
    position: "absolute",
  },
  deviceName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  deviceId: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    marginTop: 1,
  },
  right: {
    alignItems: "flex-end",
  },
  statusText: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  updatedText: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    marginTop: 1,
  },
});
