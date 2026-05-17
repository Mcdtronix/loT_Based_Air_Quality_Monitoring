import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ThemedText } from "@/components/ThemedText";
import { useDevice } from "@/context/DeviceContext";

const COLORS = {
  primary: "#0369a1",
  background: "#f8fafc",
  card: "#ffffff",
  border: "#e2e8f0",
  success: "#22c55e",
  error: "#ef4444",
  text: "#1e293b",
  textSecondary: "#64748b",
};

export default function AddDeviceScreen() {
  const { createDevice, isLoading, error } = useDevice();
  const [deviceId, setDeviceId] = useState("");
  const [deviceName, setDeviceName] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleCreateDevice = async () => {
    setValidationError(null);

    // Validation
    if (!deviceId.trim()) {
      setValidationError("Device ID is required");
      return;
    }
    if (!deviceName.trim()) {
      setValidationError("Device name is required");
      return;
    }

    if (deviceId.length < 3) {
      setValidationError("Device ID must be at least 3 characters");
      return;
    }

    if (deviceName.length < 2) {
      setValidationError("Device name must be at least 2 characters");
      return;
    }

    try {
      await createDevice({
        device_id: deviceId.trim(),
        device_name: deviceName.trim(),
      });
      // Navigate back to devices list on success
      router.replace("/(tabs)/devices");
    } catch (err) {
      // Error is handled by createDevice and will be shown
      console.error("Failed to create device:", err);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          scrollEnabled={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <ThemedText style={styles.backButtonText}>← Back</ThemedText>
            </TouchableOpacity>
            <ThemedText style={styles.headerTitle}>Add Device</ThemedText>
            <View style={{ width: 40 }} />
          </View>

          {/* Content */}
          <View style={styles.content}>
            <ThemedText style={styles.description}>
              Register the sensor using the same device name stored in the module code
            </ThemedText>

            {/* Device ID Field */}
            <View style={styles.formGroup}>
              <ThemedText style={styles.label}>Device ID</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  validationError?.includes("Device ID") && styles.inputError,
                ]}
                placeholder="e.g., AG-001"
                placeholderTextColor={COLORS.textSecondary}
                value={deviceId}
                onChangeText={setDeviceId}
                editable={!isLoading}
                autoCapitalize="characters"
              />
              <ThemedText style={styles.hint}>
                The unique identifier of your sensor (found on device label)
              </ThemedText>
            </View>

            {/* Device Name Field */}
            <View style={styles.formGroup}>
              <ThemedText style={styles.label}>Device Name</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  validationError?.includes("Device name") && styles.inputError,
                ]}
                placeholder="e.g., Living Room Sensor"
                placeholderTextColor={COLORS.textSecondary}
                value={deviceName}
                onChangeText={setDeviceName}
                editable={!isLoading}
              />
              <ThemedText style={styles.hint}>
                Must exactly match the device name uploaded from the Arduino module
              </ThemedText>
            </View>

            {/* Error Messages */}
            {validationError && (
              <View style={styles.errorBanner}>
                <ThemedText style={styles.errorText}>
                  ⚠️ {validationError}
                </ThemedText>
              </View>
            )}

            {error && (
              <View style={styles.errorBanner}>
                <ThemedText style={styles.errorText}>
                  ✕ {error}
                </ThemedText>
              </View>
            )}

            {/* Create Button */}
            <TouchableOpacity
              style={[
                styles.createButton,
                isLoading && styles.createButtonDisabled,
              ]}
              onPress={handleCreateDevice}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={COLORS.card} />
              ) : (
                <ThemedText style={styles.createButtonText}>
                  Create Device
                </ThemedText>
              )}
            </TouchableOpacity>

            {/* Instructions */}
            <View style={styles.instructionsCard}>
              <ThemedText style={styles.instructionsTitle}>
                Module setup
              </ThemedText>
              <View style={styles.instructionList}>
                <ThemedText style={styles.instructionItem}>
                  1. Set the same device name in the Arduino IDE code
                </ThemedText>
                <ThemedText style={styles.instructionItem}>
                  2. Register that exact name here in the application
                </ThemedText>
                <ThemedText style={styles.instructionItem}>
                  3. The module should post readings using device_name
                </ThemedText>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
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
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
  },
  backButtonText: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
    flex: 1,
    textAlign: "center",
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  description: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 24,
    textAlign: "center",
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 6,
  },
  inputError: {
    borderColor: COLORS.error,
    borderWidth: 2,
  },
  hint: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: "italic",
  },
  errorBanner: {
    backgroundColor: COLORS.error + "15",
    borderLeftWidth: 4,
    borderLeftColor: COLORS.error,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    color: COLORS.error,
    fontWeight: "500",
  },
  createButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    marginTop: 8,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: COLORS.card,
    fontSize: 16,
    fontWeight: "700",
  },
  instructionsCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 12,
  },
  instructionList: {
    gap: 8,
  },
  instructionItem: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
});
