import React, { useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  Text,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { MiniChart } from "@/components/MiniChart";
import { useDevice } from "@/context/DeviceContext";

const COLORS = {
  primary: "#0369a1",
  background: "#f8fafc",
  card: "#ffffff",
  border: "#e2e8f0",
  success: "#22c55e",
  warning: "#f59e0b",
  error: "#ef4444",
  text: "#1e293b",
  textSecondary: "#64748b",
};

interface SensorMetricProps {
  label: string;
  value: number | string;
  unit: string;
}

function SensorMetric({ label, value, unit }: SensorMetricProps) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <View style={styles.metricValueContainer}>
        <Text style={[styles.metricValue, { color: COLORS.primary }]}>
          {value}
        </Text>
        <Text style={styles.metricUnit}>{unit}</Text>
      </View>
    </View>
  );
}

function getAqiStatus(aqi: number): { level: string; color: string } {
  if (aqi <= 50) return { level: "Good", color: COLORS.success };
  if (aqi <= 100) return { level: "Moderate", color: COLORS.warning };
  if (aqi <= 150) return { level: "Unhealthy for Sensitive", color: "#f97316" };
  if (aqi <= 200) return { level: "Unhealthy", color: COLORS.error };
  if (aqi <= 300) return { level: "Very Unhealthy", color: "#a855f7" };
  return { level: "Hazardous", color: "#7c3aed" };
}

export default function DashboardScreen() {
  const {
    selectedDevice,
    readings,
    loadReadings,
    isLoading,
    error,
  } = useDevice();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (selectedDevice) {
      await loadReadings(selectedDevice.id);
    }
    setRefreshing(false);
  }, [selectedDevice, loadReadings]);

  useEffect(() => {
    if (!selectedDevice) {
      router.replace("/(tabs)/devices");
    }
  }, [selectedDevice]);

  if (!selectedDevice) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>No device selected</Text>
        </View>
      </SafeAreaView>
    );
  }

  const latestReading = readings?.[0];

  if (!latestReading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {selectedDevice.device_name}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={[styles.emptyText, { marginTop: 12 }]}>
            {isLoading ? "Loading readings..." : "No readings available"}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const aqiStatus = getAqiStatus(latestReading.aqi);
  const chartData = readings.slice(0, 6).reverse().map((r) => r.aqi);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {selectedDevice.device_name}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {/* AQI Gauge */}
        <View style={styles.aqiContainer}>
          <View style={styles.aqiCard}>
            <Text style={styles.aqiLabel}>Air Quality</Text>
            <Text style={[styles.aqiValue, { color: aqiStatus.color }]}>
              {Math.round(latestReading.aqi)}
            </Text>
            <Text style={styles.aqiStatus}>{aqiStatus.level}</Text>
            <Text style={styles.timestamp}>
              {new Date(latestReading.timestamp).toLocaleTimeString()}
            </Text>
          </View>
        </View>

        {/* AQI Trend Chart */}
        {readings.length > 1 && (
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>AQI Trend (Last 6)</Text>
            <MiniChart data={chartData} color={aqiStatus.color} height={120} />
          </View>
        )}

        {/* Sensor Metrics */}
        <View style={styles.metricsSection}>
          <Text style={styles.sectionTitle}>Current Readings</Text>
          <View style={styles.metricsGrid}>
            <View style={styles.metricRow}>
              <SensorMetric
                label="PM2.5"
                value={Math.round(latestReading.pm25 * 10) / 10}
                unit="µg/m³"
              />
              <SensorMetric
                label="PM10"
                value={Math.round(latestReading.pm10 * 10) / 10}
                unit="µg/m³"
              />
            </View>
            <View style={styles.metricRow}>
              <SensorMetric
                label="CO₂"
                value={Math.round(latestReading.co2)}
                unit="ppm"
              />
              <SensorMetric
                label="CO"
                value={Math.round(latestReading.carbon_monoxide * 10) / 10}
                unit="ppm"
              />
            </View>
            <View style={styles.metricRow}>
              <SensorMetric
                label="NOx"
                value={Math.round(latestReading.nitrogen_oxide * 1000) / 1000}
                unit="ppm"
              />
              <SensorMetric
                label="Humidity"
                value={Math.round(latestReading.humidity)}
                unit="%"
              />
            </View>
            <View style={styles.metricRow}>
              <SensorMetric
                label="Temperature"
                value={Math.round(latestReading.temperature * 10) / 10}
                unit="°C"
              />
              <SensorMetric
                label="Dust"
                value={Math.round(latestReading.dust_density * 10) / 10}
                unit="µg/m³"
              />
            </View>
          </View>
        </View>

        {/* Historical Data */}
        {readings.length > 1 && (
          <View style={styles.historySection}>
            <Text style={styles.sectionTitle}>Recent Readings</Text>
            <View style={styles.historyList}>
              {readings.slice(0, 5).map((reading, idx) => (
                  <View key={idx} style={styles.historyItem}>
                    <View style={styles.historyItemLeft}>
                      <Text style={styles.historyTime}>
                        {new Date(reading.timestamp).toLocaleTimeString()}
                      </Text>
                      <Text style={styles.historyDate}>
                        {new Date(reading.timestamp).toLocaleDateString()}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.historyBadge,
                        {
                          backgroundColor: getAqiStatus(reading.aqi).color + "20",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.historyAqi,
                          { color: getAqiStatus(reading.aqi).color },
                        ]}
                      >
                        {Math.round(reading.aqi)}
                      </Text>
                    </View>
                  </View>
                ))}
            </View>
          </View>
        )}

        {/* AQI Scale Reference */}
        <View style={styles.scaleSection}>
          <Text style={styles.sectionTitle}>AQI Reference Scale</Text>
          <View style={styles.scaleCard}>
            {[
              { range: "0–50", level: "Good", color: COLORS.success },
              { range: "51–100", level: "Moderate", color: COLORS.warning },
              { range: "101–150", level: "Unhealthy (Sensitive)", color: "#f97316" },
              { range: "151–200", level: "Unhealthy", color: COLORS.error },
              { range: "201–300", level: "Very Unhealthy", color: "#a855f7" },
              { range: "301+", level: "Hazardous", color: "#7c3aed" },
            ].map((item, i) => (
              <View key={i} style={[styles.scaleRow, i > 0 && { borderTopWidth: 1, borderTopColor: COLORS.border }]}>
                <View style={[styles.scaleColor, { backgroundColor: item.color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.scaleLevel, { color: item.color }]}>
                    {item.level}
                  </Text>
                  <Text style={styles.scaleRange}>{item.range}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    flex: 1,
    textAlign: "center",
  },
  backButton: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: "600",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.error,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  aqiContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  aqiCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  aqiLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
    fontWeight: "600",
  },
  aqiValue: {
    fontSize: 48,
    fontWeight: "700",
    marginBottom: 4,
  },
  aqiStatus: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 12,
  },
  timestamp: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  chartContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.card,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 12,
  },
  metricsSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 12,
  },
  metricsGrid: {
    gap: 12,
  },
  metricRow: {
    flexDirection: "row",
    gap: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  metricLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
    fontWeight: "600",
  },
  metricValueContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  metricUnit: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  historySection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  historyList: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  historyItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  historyItemLeft: {
    flex: 1,
  },
  historyTime: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  historyDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  historyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  historyAqi: {
    fontSize: 14,
    fontWeight: "700",
  },
  scaleSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  scaleCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  scaleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 12,
  },
  scaleColor: {
    width: 12,
    height: 32,
    borderRadius: 4,
  },
  scaleLevel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 2,
  },
  scaleRange: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  errorContainer: {
    marginHorizontal: 16,
    marginVertical: 12,
    backgroundColor: COLORS.error + "20",
    borderRadius: 8,
    padding: 12,
  },
});
