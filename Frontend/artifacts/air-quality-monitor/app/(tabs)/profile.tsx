import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useDevice } from "@/context/DeviceContext";
import { useColors } from "@/hooks/useColors";

function SettingRow({
  icon,
  label,
  value,
  onPress,
  destructive,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
}) {
  const colors = useColors();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.settingRow, { borderBottomColor: colors.border }]}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      <View style={[styles.settingIcon, { backgroundColor: destructive ? `${colors.destructive}12` : `${colors.primary}12` }]}>
        <Feather name={icon} size={16} color={destructive ? colors.destructive : colors.primary} />
      </View>
      <Text style={[styles.settingLabel, { color: destructive ? colors.destructive : colors.foreground }]}>
        {label}
      </Text>
      <View style={styles.settingRight}>
        {value && (
          <Text style={[styles.settingValue, { color: colors.mutedForeground }]}>{value}</Text>
        )}
        {onPress && <Feather name="chevron-right" size={16} color={colors.mutedForeground} />}
      </View>
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { deviceId, deviceName, isDeviceOnline } = useDevice();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const handleLogout = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out of AirGuard?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await logout();
          },
        },
      ]
    );
  };

  const initials = user?.fullName
    ? user.fullName
        .split(" ")
        .slice(0, 2)
        .map((n) => n[0]?.toUpperCase())
        .join("")
    : "AG";

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString([], {
        year: "numeric",
        month: "long",
      })
    : "";

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.scroll,
        {
          paddingTop: topPad + 12,
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 84) + 16,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.profileHeader}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={[styles.userName, { color: colors.foreground }]}>
          {user?.fullName ?? "User"}
        </Text>
        <Text style={[styles.userEmail, { color: colors.mutedForeground }]}>
          {user?.email}
        </Text>
        {memberSince && (
          <Text style={[styles.memberSince, { color: colors.mutedForeground }]}>
            Member since {memberSince}
          </Text>
        )}
      </View>

      {user?.medicalCondition && user.medicalCondition !== "None" && (
        <View style={[styles.conditionBadge, { backgroundColor: `${colors.accent}12`, borderColor: `${colors.accent}40` }]}>
          <Feather name="activity" size={14} color={colors.accent} />
          <Text style={[styles.conditionText, { color: colors.accent }]}>
            Condition: {user.medicalCondition}
          </Text>
        </View>
      )}

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>ACCOUNT</Text>
        <SettingRow
          icon="user"
          label="Full Name"
          value={user?.fullName}
        />
        <SettingRow
          icon="mail"
          label="Email Address"
          value={user?.email}
        />
        <SettingRow
          icon="phone"
          label="Phone Number"
          value={user?.phone}
        />
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>IOT DEVICE</Text>
        <SettingRow
          icon="cpu"
          label="Device Name"
          value={deviceName}
        />
        <SettingRow
          icon="hash"
          label="Device ID"
          value={deviceId}
        />
        <SettingRow
          icon="wifi"
          label="Connection Status"
          value={isDeviceOnline ? "Online" : "Offline"}
        />
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>HEALTH</Text>
        <SettingRow
          icon="activity"
          label="Respiratory Condition"
          value={user?.medicalCondition ?? "Not set"}
        />
        <SettingRow
          icon="shield"
          label="Health Alerts"
          value="Enabled"
        />
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>APP</Text>
        <SettingRow
          icon="bell"
          label="Notifications"
          value="On"
        />
        <SettingRow
          icon="refresh-cw"
          label="Data Refresh Rate"
          value="15 sec"
        />
        <SettingRow
          icon="info"
          label="App Version"
          value="1.0.0"
        />
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <SettingRow
          icon="log-out"
          label="Sign Out"
          onPress={handleLogout}
          destructive
        />
      </View>

      <Text style={[styles.footer, { color: colors.mutedForeground }]}>
        AirGuard — IoT Air Quality Monitor{"\n"}
        Designed for respiratory health management
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 16,
    gap: 14,
  },
  profileHeader: {
    alignItems: "center",
    paddingVertical: 8,
    gap: 6,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  avatarText: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    color: "#fff",
  },
  userName: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
  },
  userEmail: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },
  memberSince: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
  conditionBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: "center",
  },
  conditionText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  section: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
    borderBottomWidth: 1,
  },
  settingIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  settingLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    flex: 1,
  },
  settingRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  settingValue: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
  },
  footer: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
    paddingVertical: 8,
  },
});
