import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Image,
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
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

interface FormErrors {
  email?: string;
  password?: string;
}

function validate(email: string, password: string): FormErrors {
  const errors: FormErrors = {};
  if (!email.trim()) {
    errors.email = "Email address is required";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    errors.email = "Please enter a valid email address";
  }
  if (!password) {
    errors.password = "Password is required";
  } else if (password.length < 8) {
    errors.password = "Password must be at least 8 characters";
  }
  return errors;
}

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [globalError, setGlobalError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const errs = validate(email, password);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setLoading(true);
    setGlobalError("");
    setErrors({});
    try {
      const result = await login(email.trim().toLowerCase(), password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (result.requiresVerification) {
        router.replace({
          pathname: "/auth/verify-otp",
          params: { email: email.trim().toLowerCase() },
        });
      } else {
        router.replace("/(tabs)");
      }
    } catch (e: any) {
      setGlobalError(e.message ?? "Login failed. Please try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (field: keyof FormErrors, value: string) => {
    if (field === "email") setEmail(value);
    else setPassword(value);
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
    if (globalError) setGlobalError("");
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
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 40,
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 32,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Image
            source={require("../../assets/images/icon.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={[styles.appName, { color: colors.primary }]}>AirGuard</Text>
          <Text style={[styles.tagline, { color: colors.mutedForeground }]}>
            Smart air quality monitoring for{"\n"}respiratory health
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>
            Welcome Back
          </Text>
          <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
            Sign in to your account
          </Text>

          <View style={styles.form}>
            <FormInput
              label="Email Address"
              icon="mail"
              placeholder="you@example.com"
              value={email}
              onChangeText={(v) => handleFieldChange("email", v)}
              error={errors.email}
              required
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />

            <FormInput
              label="Password"
              icon="lock"
              placeholder="Enter your password"
              value={password}
              onChangeText={(v) => handleFieldChange("password", v)}
              error={errors.password}
              required
              isPassword
            />

            {globalError ? (
              <View style={[styles.globalError, { backgroundColor: `${colors.destructive}12`, borderColor: `${colors.destructive}40` }]}>
                <Feather name="alert-circle" size={15} color={colors.destructive} />
                <Text style={[styles.globalErrorText, { color: colors.destructive }]}>
                  {globalError}
                </Text>
              </View>
            ) : null}

            <PrimaryButton
              title="Sign In"
              onPress={handleLogin}
              loading={loading}
            />
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity onPress={() => router.push("/auth/register")}>
            <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
              Don't have an account?{" "}
              <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>
                Create Account
              </Text>
            </Text>
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={[styles.healthBox, { backgroundColor: `${colors.accent}12`, borderColor: `${colors.accent}30` }]}>
            <Feather name="wind" size={14} color={colors.accent} />
            <Text style={[styles.healthText, { color: colors.accent }]}>
              Monitor air quality. Protect your lungs.
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 24,
    gap: 24,
  },
  header: {
    alignItems: "center",
    gap: 8,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 20,
  },
  appName: {
    fontFamily: "Inter_700Bold",
    fontSize: 32,
    letterSpacing: -0.5,
  },
  tagline: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    gap: 4,
    elevation: 2,
    shadowColor: "#0ea5e9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  cardTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
  },
  cardSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    marginBottom: 12,
  },
  form: {
    gap: 14,
  },
  globalError: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  globalErrorText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  footer: {
    alignItems: "center",
    gap: 16,
  },
  footerText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    textAlign: "center",
  },
  divider: {
    height: 1,
    width: "80%",
  },
  healthBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
  },
  healthText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
});
