import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React from "react";
import {
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AqiGauge } from "@/components/AqiGauge";
import { DeviceStatusBanner } from "@/components/DeviceStatusBanner";
import { SensorCard } from "@/components/SensorCard";
import { useAuth } from "@/context/AuthContext";
import { useDevice } from "@/context/DeviceContext";
import { useColors } from "@/hooks/useColors";

function getHealthAdvice(aqi: number, condition: string): string {
  const isRespiratory = condition !== "None";
  if (aqi <= 50) return "Air quality is excellent. Safe for all activities.";
  if (aqi <= 100)
    return isRespiratory
      ? "Moderate air quality. Limit prolonged outdoor exertion."
      : "Moderate air quality. Good for most people.";
  if (aqi <= 150)
    return isRespiratory
      ? "Unhealthy for sensitive groups. Stay indoors with windows closed."
      : "Sensitive groups should reduce outdoor activity.";
  if (aqi <= 200)
    return "Unhealthy. Everyone should reduce prolonged outdoor exertion.";
  if (aqi <= 300)
    return "Very unhealthy. Avoid outdoor activities. Keep windows sealed.";
  return "Hazardous! Stay indoors. Use air purifier. Seek medical advice if symptomatic.";
}

function pm25Status(v: number): "good" | "moderate" | "bad" {
  if (v <= 12) return "good";
  if (v <= 35) return "moderate";
  return "bad";
}

function pm10Status(v: number): "good" | "moderate" | "bad" {
  if (v <= 50) return "good";
  if (v <= 100) return "moderate";
  return "bad";
}

function co2Status(v: number): "good" | "moderate" | "bad" {
  if (v <= 600) return "good";
  if (v <= 1000) return "moderate";
  return "bad";
}

function carbonMonoxideStatus(v: number): "good" | "moderate" | "bad" {
  if (v <= 4.4) return "good";
  if (v <= 9.4) return "moderate";
  return "bad";
}

function nitrogenOxideStatus(v: number): "good" | "moderate" | "bad" {
  if (v <= 0.053) return "good";
  if (v <= 0.1) return "moderate";
  return "bad";
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { current, isDeviceOnline, refreshData, unreadAlerts } = useDevice();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    refreshData();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeout(() => setRefreshing(false), 1200);
  }, [refreshData]);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const advice = current
    ? getHealthAdvice(current.aqi, user?.medicalCondition ?? "None")
    : "";

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.scroll,
        {
          paddingTop: topPad + 12,
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 84),
        },
      ]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
    >
      <View style={styles.topRow}>
        <View>
          <Text style={[styles.greeting, { color: colors.mutedForeground }]}>
            Hello, {user?.fullName?.split(" ")[0] ?? "User"}
          </Text>
          <Text style={[styles.greetingBold, { color: colors.foreground }]}>
            Air Quality Monitor
          </Text>
        </View>
        <View style={styles.topRight}>
          {unreadAlerts > 0 && (
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/alerts")}
              style={[styles.alertBtn, { backgroundColor: `${colors.destructive}15` }]}
            >
              <Feather name="bell" size={20} color={colors.destructive} />
              <View style={[styles.badge, { backgroundColor: colors.destructive }]}>
                <Text style={styles.badgeText}>{unreadAlerts}</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <DeviceStatusBanner />

      {current && isDeviceOnline ? (
        <>
          <View style={[styles.gaugeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Current Air Quality
            </Text>
            <AqiGauge
              aqi={current.aqi}
              level={current.aqiLevel}
              color={current.aqiColor}
              size="large"
            />
          </View>

          <View
            style={[
              styles.adviceBox,
              { backgroundColor: `${current.aqiColor}12`, borderColor: `${current.aqiColor}40` },
            ]}
          >
            <Feather
              name={current.aqi <= 50 ? "check-circle" : current.aqi <= 100 ? "info" : "alert-triangle"}
              size={16}
              color={current.aqiColor}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.adviceTitle, { color: current.aqiColor }]}>
                Health Advisory
              </Text>
              <Text style={[styles.adviceText, { color: colors.foreground }]}>
                {advice}
              </Text>
              {user?.medicalCondition && user.medicalCondition !== "None" && (
                <Text style={[styles.conditionTag, { color: colors.mutedForeground }]}>
                  Tailored for: {user.medicalCondition}
                </Text>
              )}
            </View>
          </View>

          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Sensor Readings
          </Text>
          <View style={styles.sensorGrid}>
            <SensorCard
              icon="cloud"
              label="PM2.5"
              value={current.pm25.toFixed(1)}
              unit="μg/m³"
              status={pm25Status(current.pm25)}
            />
            <SensorCard
              icon="wind"
              label="PM10"
              value={current.pm10.toFixed(1)}
              unit="μg/m³"
              status={pm10Status(current.pm10)}
            />
          </View>
          <View style={styles.sensorGrid}>
            <SensorCard
              icon="activity"
              label="CO₂"
              value={Math.round(current.co2).toString()}
              unit="ppm"
              status={co2Status(current.co2)}
            />
            <SensorCard
              icon="alert-circle"
              label="CO"
              value={current.carbon_monoxide.toFixed(1)}
              unit="ppm"
              status={carbonMonoxideStatus(current.carbon_monoxide)}
            />
          </View>
          <View style={styles.sensorGrid}>
            <SensorCard
              icon="cloud"
              label="NOx"
              value={current.nitrogen_oxide.toFixed(3)}
              unit="ppm"
              status={nitrogenOxideStatus(current.nitrogen_oxide)}
            />
            <SensorCard
              icon="droplet"
              label="Humidity"
              value={current.humidity.toFixed(0)}
              unit="%"
              color={colors.accent}
            />
            <SensorCard
              icon="thermometer"
              label="Temp"
              value={current.temperature.toFixed(1)}
              unit="°C"
              color={colors.primary}
            />
          </View>

          <TouchableOpacity
            style={[styles.dashboardBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/(tabs)/dashboard")}
            activeOpacity={0.85}
          >
            <Feather name="bar-chart-2" size={18} color="#fff" />
            <Text style={styles.dashboardBtnText}>View Full Dashboard</Text>
            <Feather name="chevron-right" size={18} color="#fff" />
          </TouchableOpacity>
        </>
      ) : (
        <View style={[styles.offlineCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="wifi-off" size={48} color={colors.mutedForeground} />
          <Text style={[styles.offlineTitle, { color: colors.foreground }]}>
            Device Offline
          </Text>
          <Text style={[styles.offlineSub, { color: colors.mutedForeground }]}>
            No readings available. Check that your IoT sensor is powered on and connected to the network.
          </Text>
          <TouchableOpacity
            onPress={onRefresh}
            style={[styles.retryBtn, { borderColor: colors.primary }]}
          >
            <Feather name="refresh-cw" size={14} color={colors.primary} />
            <Text style={[styles.retryText, { color: colors.primary }]}>Retry Connection</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 16,
    gap: 14,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  greeting: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
  },
  greetingBold: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
  },
  topRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  alertBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: {
    color: "#fff",
    fontSize: 9,
    fontFamily: "Inter_700Bold",
  },
  gaugeCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
    gap: 16,
  },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
  adviceBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  adviceTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    marginBottom: 2,
  },
  adviceText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 18,
  },
  conditionTag: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    marginTop: 4,
    fontStyle: "italic",
  },
  sensorGrid: {
    flexDirection: "row",
    gap: 10,
  },
  dashboardBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 15,
    marginTop: 4,
  },
  dashboardBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: "#fff",
    flex: 1,
    textAlign: "center",
  },
  offlineCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 32,
    alignItems: "center",
    gap: 12,
    marginTop: 8,
  },
  offlineTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
  },
  offlineSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginTop: 4,
  },
  retryText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
});
