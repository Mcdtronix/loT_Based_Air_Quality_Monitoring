import React, { useEffect } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ThemedText } from "@/components/ThemedText";
import { useDevice } from "@/context/DeviceContext";
import { useAuth } from "@/context/AuthContext";

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

interface DeviceItemProps {
  id: number;
  device_id: string;
  device_name: string;
  status: "online" | "offline";
  last_reading: {
    aqi: number;
    timestamp: string;
  } | null;
  onPress: () => void;
  isSelected: boolean;
}

function DeviceItem({
  id,
  device_id,
  device_name,
  status,
  last_reading,
  onPress,
  isSelected,
}: DeviceItemProps) {
  const isOnline = status === "online";
  const statusColor = isOnline ? COLORS.success : COLORS.textSecondary;

  return (
    <TouchableOpacity
      style={[
        styles.deviceCard,
        isSelected && { borderColor: COLORS.primary, borderWidth: 2 },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.deviceHeader}>
        <View style={styles.deviceInfo}>
          <ThemedText
            style={[
              styles.deviceName,
              { color: isSelected ? COLORS.primary : COLORS.text },
            ]}
          >
            {device_name}
          </ThemedText>
          <ThemedText style={styles.deviceId}>{device_id}</ThemedText>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: isOnline ? COLORS.success : COLORS.textSecondary },
          ]}
        >
          <ThemedText style={styles.statusText}>
            {isOnline ? "Online" : "Offline"}
          </ThemedText>
        </View>
      </View>

      {last_reading && (
        <View style={styles.readingContainer}>
          <View style={styles.readingItem}>
            <ThemedText style={styles.readingLabel}>AQI</ThemedText>
            <ThemedText
              style={[
                styles.readingValue,
                {
                  color:
                    last_reading.aqi > 150
                      ? COLORS.error
                      : last_reading.aqi > 100
                        ? COLORS.warning
                        : COLORS.success,
                },
              ]}
            >
              {last_reading.aqi}
            </ThemedText>
          </View>
          <ThemedText style={styles.timestamp}>
            {new Date(last_reading.timestamp).toLocaleTimeString()}
          </ThemedText>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function DevicesScreen() {
  const { devices, selectedDevice, selectDevice, loadDevices, isLoading, error } =
    useDevice();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      loadDevices();
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ThemedText style={styles.errorText}>Not authenticated</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading && devices.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <ThemedText style={styles.loadingText}>
            Loading devices...
          </ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadDevices}
          >
            <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (devices.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <ThemedText style={styles.headerTitle}>My Devices</ThemedText>
          <ThemedText style={styles.headerSubtitle}>
            Manage your air quality sensors
          </ThemedText>
        </View>

        <View style={styles.centerContainer}>
          <ThemedText style={styles.emptyText}>
            No devices added yet
          </ThemedText>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push("/add-device")}
          >
            <ThemedText style={styles.addButtonText}>+ Add Device</ThemedText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.headerTitle}>My Devices</ThemedText>
        <ThemedText style={styles.headerSubtitle}>
          {devices.length} device{devices.length !== 1 ? "s" : ""}
        </ThemedText>
      </View>

      <FlatList
        data={devices}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <DeviceItem
            {...item}
            onPress={() => {
              selectDevice(item);
              router.push("/(tabs)/dashboard");
            }}
            isSelected={selectedDevice?.id === item.id}
          />
        )}
        contentContainerStyle={styles.listContent}
        scrollEnabled={devices.length > 3}
        ListFooterComponent={
          <TouchableOpacity
            style={styles.addDeviceFooter}
            onPress={() => router.push("/add-device")}
          >
            <ThemedText style={styles.addDeviceText}>+ Add Device</ThemedText>
          </TouchableOpacity>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  deviceCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  deviceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  deviceId: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontFamily: "monospace",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.card,
  },
  readingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  readingItem: {
    flex: 1,
  },
  readingLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  readingValue: {
    fontSize: 20,
    fontWeight: "700",
  },
  timestamp: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: "right",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 24,
    textAlign: "center",
  },
  addButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: COLORS.card,
    fontSize: 16,
    fontWeight: "600",
  },
  addDeviceFooter: {
    marginTop: 16,
    marginBottom: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: COLORS.primary,
    alignItems: "center",
  },
  addDeviceText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: "600",
  },
  errorText: {
    fontSize: 16,
    color: COLORS.error,
    marginBottom: 16,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: COLORS.card,
    fontSize: 16,
    fontWeight: "600",
  },
});
