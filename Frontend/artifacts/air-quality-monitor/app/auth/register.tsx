import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FormInput } from "@/components/FormInput";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useAuth, RegisterData } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

interface FormErrors {
  fullName?: string;
  email?: string;
  phone?: string;
  password?: string;
  confirmPassword?: string;
  medicalCondition?: string;
}

const MEDICAL_CONDITIONS = [
  "Asthma",
  "COPD",
  "Bronchitis",
  "Emphysema",
  "Pulmonary Fibrosis",
  "Allergic Rhinitis",
  "Sleep Apnea",
  "Other",
  "None",
];

function validateForm(data: Partial<RegisterData>): FormErrors {
  const errors: FormErrors = {};

  if (!data.fullName?.trim()) {
    errors.fullName = "Full name is required";
  } else if (data.fullName.trim().length < 2) {
    errors.fullName = "Name must be at least 2 characters";
  } else if (!/^[a-zA-Z\s'-]+$/.test(data.fullName.trim())) {
    errors.fullName = "Name can only contain letters, spaces, hyphens, and apostrophes";
  }

  if (!data.email?.trim()) {
    errors.email = "Email address is required";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
    errors.email = "Please enter a valid email address";
  }

  if (!data.phone?.trim()) {
    errors.phone = "Phone number is required";
  } else if (!/^\+?[\d\s\-()]{10,15}$/.test(data.phone.trim())) {
    errors.phone = "Please enter a valid phone number (10-15 digits)";
  }

  if (!data.password) {
    errors.password = "Password is required";
  } else if (data.password.length < 8) {
    errors.password = "Password must be at least 8 characters";
  } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(data.password)) {
    errors.password =
      "Password must contain uppercase, lowercase, and a number";
  }

  if (!data.confirmPassword) {
    errors.confirmPassword = "Please confirm your password";
  } else if (data.password !== data.confirmPassword) {
    errors.confirmPassword = "Passwords do not match";
  }

  if (!data.medicalCondition) {
    errors.medicalCondition = "Please select your medical condition";
  }

  return errors;
}

export default function RegisterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { register } = useAuth();

  const [form, setForm] = useState<Partial<RegisterData>>({});
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [conditionOpen, setConditionOpen] = useState(false);
  const [globalError, setGlobalError] = useState("");

  const update = (key: keyof RegisterData, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
    if (globalError) setGlobalError("");
  };

  const handleSubmit = async () => {
    const errs = validateForm(form);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setLoading(true);
    setGlobalError("");
    try {
      await register(form as RegisterData);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace({
        pathname: "/auth/verify-otp",
        params: { email: form.email },
      });
    } catch (e: any) {
      setGlobalError(e.message ?? "Registration failed. Please try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 16,
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 32,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={[styles.iconCircle, { backgroundColor: `${colors.primary}15` }]}>
            <Feather name="user-plus" size={28} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>Create Account</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Join AirGuard to monitor air quality tailored to your health needs
          </Text>
        </View>

        <View style={styles.form}>
          <FormInput
            label="Full Name"
            icon="user"
            placeholder="e.g. John Adeyemi"
            value={form.fullName ?? ""}
            onChangeText={(v) => update("fullName", v)}
            error={errors.fullName}
            required
            autoCapitalize="words"
          />

          <FormInput
            label="Email Address"
            icon="mail"
            placeholder="you@example.com"
            value={form.email ?? ""}
            onChangeText={(v) => update("email", v)}
            error={errors.email}
            required
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />

          <FormInput
            label="Phone Number"
            icon="phone"
            placeholder="+234 800 000 0000"
            value={form.phone ?? ""}
            onChangeText={(v) => update("phone", v)}
            error={errors.phone}
            required
            keyboardType="phone-pad"
          />

          <FormInput
            label="Password"
            icon="lock"
            placeholder="Min. 8 chars, uppercase & number"
            value={form.password ?? ""}
            onChangeText={(v) => update("password", v)}
            error={errors.password}
            required
            isPassword
          />

          <FormInput
            label="Confirm Password"
            icon="lock"
            placeholder="Re-enter your password"
            value={form.confirmPassword ?? ""}
            onChangeText={(v) => update("confirmPassword", v)}
            error={errors.confirmPassword}
            required
            isPassword
          />

          <View style={styles.conditionWrap}>
            <Text style={[styles.condLabel, { color: colors.foreground }]}>
              Respiratory Condition <Text style={{ color: colors.destructive }}>*</Text>
            </Text>
            <TouchableOpacity
              style={[
                styles.condPicker,
                {
                  borderColor: errors.medicalCondition ? colors.destructive : conditionOpen ? colors.primary : colors.border,
                  backgroundColor: colors.card,
                },
              ]}
              onPress={() => setConditionOpen(!conditionOpen)}
              activeOpacity={0.8}
            >
              <Feather name="activity" size={18} color={colors.mutedForeground} style={{ marginRight: 10 }} />
              <Text
                style={[
                  styles.condValue,
                  { color: form.medicalCondition ? colors.foreground : colors.mutedForeground },
                ]}
              >
                {form.medicalCondition ?? "Select your condition"}
              </Text>
              <Feather
                name={conditionOpen ? "chevron-up" : "chevron-down"}
                size={18}
                color={colors.mutedForeground}
              />
            </TouchableOpacity>
            {errors.medicalCondition && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Feather name="alert-circle" size={12} color={colors.destructive} />
                <Text style={[styles.errorText, { color: colors.destructive }]}>
                  {errors.medicalCondition}
                </Text>
              </View>
            )}
            {conditionOpen && (
              <View style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {MEDICAL_CONDITIONS.map((cond) => (
                  <TouchableOpacity
                    key={cond}
                    style={[
                      styles.dropItem,
                      form.medicalCondition === cond && { backgroundColor: `${colors.primary}12` },
                    ]}
                    onPress={() => {
                      update("medicalCondition", cond);
                      setConditionOpen(false);
                    }}
                  >
                    {form.medicalCondition === cond && (
                      <Feather name="check" size={14} color={colors.primary} />
                    )}
                    <Text
                      style={[
                        styles.dropItemText,
                        { color: form.medicalCondition === cond ? colors.primary : colors.foreground },
                      ]}
                    >
                      {cond}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {globalError ? (
            <View style={[styles.globalError, { backgroundColor: `${colors.destructive}12`, borderColor: `${colors.destructive}40` }]}>
              <Feather name="alert-triangle" size={16} color={colors.destructive} />
              <Text style={[styles.globalErrorText, { color: colors.destructive }]}>
                {globalError}
              </Text>
            </View>
          ) : null}

          <View style={[styles.infoBox, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}30` }]}>
            <Feather name="info" size={14} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.primary }]}>
              A 6-digit verification code will be sent to your email to activate your account.
            </Text>
          </View>

          <PrimaryButton
            title="Create Account"
            onPress={handleSubmit}
            loading={loading}
          />

          <TouchableOpacity onPress={() => router.replace("/auth/login")} style={styles.loginLink}>
            <Text style={[styles.loginText, { color: colors.mutedForeground }]}>
              Already have an account?{" "}
              <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>
                Sign In
              </Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 24,
  },
  backBtn: {
    marginBottom: 16,
  },
  header: {
    alignItems: "center",
    marginBottom: 28,
    gap: 10,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  form: {
    gap: 16,
  },
  conditionWrap: {
    gap: 6,
  },
  condLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  condPicker: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    minHeight: 50,
  },
  condValue: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
  },
  dropdown: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  dropItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  dropItemText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
  },
  errorText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
  globalError: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  globalErrorText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
  },
  loginLink: {
    alignItems: "center",
    paddingVertical: 4,
  },
  loginText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },
});
