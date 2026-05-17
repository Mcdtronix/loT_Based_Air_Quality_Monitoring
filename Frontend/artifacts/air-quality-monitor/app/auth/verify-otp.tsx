import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60;

export default function VerifyOtpScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { email } = useLocalSearchParams<{ email: string }>();
  const { verifyOtp, resendOtp } = useAuth();

  const [code, setCode] = useState<string[]>(new Array(OTP_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(RESEND_COOLDOWN);
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    startCountdown();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startCountdown = () => {
    setCountdown(RESEND_COOLDOWN);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  };

  const handleChange = (text: string, index: number) => {
    const digits = text.replace(/\D/g, "");
    if (!digits) {
      const next = [...code];
      next[index] = "";
      setCode(next);
      return;
    }

    if (digits.length >= OTP_LENGTH) {
      const filled = digits.slice(0, OTP_LENGTH).split("");
      setCode(filled);
      inputRefs.current[OTP_LENGTH - 1]?.focus();
      return;
    }

    const next = [...code];
    next[index] = digits[digits.length - 1];
    setCode(next);
    if (index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
    if (error) setError("");
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === "Backspace" && !code[index] && index > 0) {
      const next = [...code];
      next[index - 1] = "";
      setCode(next);
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const fullCode = code.join("");
    if (fullCode.length < OTP_LENGTH) {
      setError("Please enter all 6 digits of the verification code");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setLoading(true);
    setError("");
    try {
      await verifyOtp(email ?? "", fullCode);
      setSuccess(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => {
        router.replace("/auth/login");
      }, 2000);
    } catch (e: any) {
      setError(e.message ?? "Verification failed. Please try again.");
      setCode(new Array(OTP_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setResending(true);
    setError("");
    try {
      await resendOtp(email ?? "");
      startCountdown();
      setCode(new Array(OTP_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      setError(e.message ?? "Failed to resend code.");
    } finally {
      setResending(false);
    }
  };

  if (success) {
    return (
      <View style={[styles.successContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.successIcon, { backgroundColor: `${colors.success}15` }]}>
          <Feather name="check-circle" size={56} color={colors.success} />
        </View>
        <Text style={[styles.successTitle, { color: colors.foreground }]}>
          Account Activated!
        </Text>
        <Text style={[styles.successSub, { color: colors.mutedForeground }]}>
          Your account has been verified. Redirecting you to sign in...
        </Text>
      </View>
    );
  }

  const maskedEmail = email
    ? `${email.slice(0, 3)}***@${email.split("@")[1]}`
    : "your email";

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View
        style={[
          styles.container,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 24,
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 32,
          },
        ]}
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
            <Feather name="shield" size={32} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Verify Your Email
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            We sent a 6-digit code to{"\n"}
            <Text style={[styles.emailHighlight, { color: colors.primary }]}>
              {maskedEmail}
            </Text>
            {"\n"}Enter it below to activate your account.
          </Text>
        </View>

        <View style={styles.otpRow}>
          {Array.from({ length: OTP_LENGTH }).map((_, i) => (
            <TextInput
              key={i}
              ref={(r) => { inputRefs.current[i] = r; }}
              style={[
                styles.otpBox,
                {
                  borderColor: error
                    ? colors.destructive
                    : code[i]
                    ? colors.primary
                    : colors.border,
                  backgroundColor: code[i] ? `${colors.primary}10` : colors.card,
                  color: colors.foreground,
                },
              ]}
              value={code[i]}
              onChangeText={(t) => handleChange(t, i)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
              keyboardType="numeric"
              maxLength={OTP_LENGTH}
              textAlign="center"
              selectTextOnFocus
              autoFocus={i === 0}
            />
          ))}
        </View>

        {error ? (
          <View style={[styles.errorBox, { backgroundColor: `${colors.destructive}12`, borderColor: `${colors.destructive}40` }]}>
            <Feather name="alert-circle" size={14} color={colors.destructive} />
            <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
          </View>
        ) : null}

        <View style={[styles.infoBox, { backgroundColor: `${colors.warning}12`, borderColor: `${colors.warning}40` }]}>
          <Feather name="clock" size={13} color={colors.warning} />
          <Text style={[styles.infoText, { color: colors.warning }]}>
            Enter the 6-digit code sent by the Django backend to your email address.
          </Text>
        </View>

        <PrimaryButton
          title="Verify & Activate"
          onPress={handleVerify}
          loading={loading}
          disabled={code.join("").length < OTP_LENGTH}
        />

        <TouchableOpacity
          onPress={handleResend}
          disabled={countdown > 0 || resending}
          style={styles.resendBtn}
        >
          <Text style={[styles.resendText, { color: colors.mutedForeground }]}>
            Didn't receive a code?{" "}
            {countdown > 0 ? (
              <Text style={{ color: colors.primary }}>Resend in {countdown}s</Text>
            ) : (
              <Text style={[{ color: colors.primary, fontFamily: "Inter_600SemiBold" }, resending && { opacity: 0.5 }]}>
                {resending ? "Sending..." : "Resend Code"}
              </Text>
            )}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    gap: 20,
  },
  backBtn: {
    marginBottom: 4,
  },
  header: {
    alignItems: "center",
    gap: 10,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
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
    lineHeight: 22,
  },
  emailHighlight: {
    fontFamily: "Inter_600SemiBold",
  },
  otpRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginVertical: 8,
  },
  otpBox: {
    width: 46,
    height: 56,
    borderRadius: 12,
    borderWidth: 2,
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    textAlign: "center",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  errorText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    flex: 1,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  infoText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
  },
  resendBtn: {
    alignItems: "center",
    paddingVertical: 4,
  },
  resendText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },
  successContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: 32,
  },
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  successTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    textAlign: "center",
  },
  successSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
});
