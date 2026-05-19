import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Pressable,
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
  onEdit: () => void;
  onDelete: () => void;
  isSelected: boolean;
}

function DeviceItem({
  id,
  device_id,
  device_name,
  status,
  last_reading,
  onPress,
  onEdit,
  onDelete,
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
        <View style={styles.statusAndActions}>
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
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={onEdit}
              activeOpacity={0.6}
            >
              <ThemedText style={styles.actionButtonText}>✏️</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={onDelete}
              activeOpacity={0.6}
            >
              <ThemedText style={styles.actionButtonText}>🗑️</ThemedText>
            </TouchableOpacity>
          </View>
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

interface EditDeviceModalProps {
  visible: boolean;
  deviceName: string;
  onDismiss: () => void;
  onSave: (newName: string) => void;
  isLoading: boolean;
}

function EditDeviceModal({
  visible,
  deviceName,
  onDismiss,
  onSave,
  isLoading,
}: EditDeviceModalProps) {
  const [newName, setNewName] = useState(deviceName);

  useEffect(() => {
    setNewName(deviceName);
  }, [deviceName]);

  const handleSave = () => {
    if (newName.trim().length === 0) {
      Alert.alert("Error", "Device name cannot be empty");
      return;
    }
    onSave(newName);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <Pressable style={styles.modalOverlay} onPress={onDismiss}>
        <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
          <ThemedText style={styles.modalTitle}>Edit Device Name</ThemedText>

          <TextInput
            style={styles.textInput}
            placeholder="Enter device name"
            placeholderTextColor={COLORS.textSecondary}
            value={newName}
            onChangeText={setNewName}
            editable={!isLoading}
            maxLength={100}
          />

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={onDismiss}
              disabled={isLoading}
            >
              <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.saveButton]}
              onPress={handleSave}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={COLORS.card} />
              ) : (
                <ThemedText style={styles.saveButtonText}>Save</ThemedText>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function DevicesScreen() {
  const {
    devices,
    selectedDevice,
    selectDevice,
    loadDevices,
    updateDevice,
    deleteDevice,
    isLoading,
    error,
  } = useDevice();
  const { isAuthenticated } = useAuth();
  const [editingDevice, setEditingDevice] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      loadDevices();
    }
  }, [isAuthenticated]);

  const handleEditDevice = (device: { id: number; device_name: string }) => {
    setEditingDevice({ id: device.id, name: device.device_name });
  };

  const handleSaveEditDevice = async (newName: string) => {
    if (!editingDevice) return;

    try {
      setIsUpdating(true);
      await updateDevice(editingDevice.id, { device_name: newName });
      setEditingDevice(null);
      Alert.alert("Success", "Device updated successfully");
    } catch (err) {
      Alert.alert("Error", "Failed to update device");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteDevice = (device: { id: number; device_name: string }) => {
    Alert.alert(
      "Delete Device",
      `Are you sure you want to delete "${device.device_name}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDevice(device.id);
              Alert.alert("Success", "Device deleted successfully");
            } catch (err) {
              Alert.alert("Error", "Failed to delete device");
            }
          },
        },
      ]
    );
  };

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
            onEdit={() => handleEditDevice(item)}
            onDelete={() => handleDeleteDevice(item)}
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

      <EditDeviceModal
        visible={editingDevice !== null}
        deviceName={editingDevice?.name ?? ""}
        onDismiss={() => setEditingDevice(null)}
        onSave={handleSaveEditDevice}
        isLoading={isUpdating}
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
  statusAndActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
  actionButtons: {
    flexDirection: "row",
    gap: 6,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  deleteButton: {
    borderColor: COLORS.error,
    backgroundColor: "#fff5f5",
  },
  actionButtonText: {
    fontSize: 16,
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 16,
  },
  textInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 24,
    backgroundColor: COLORS.background,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "flex-end",
  },
  modalButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    minWidth: 80,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelButtonText: {
    color: COLORS.text,
    fontWeight: "600",
  },
  saveButton: {
    backgroundColor: COLORS.primary,
  },
  saveButtonText: {
    color: COLORS.card,
    fontWeight: "600",
  },
});
