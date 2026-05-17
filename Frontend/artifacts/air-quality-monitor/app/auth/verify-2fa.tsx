import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

export default function Verify2FAScreen({ navigation, route }: any) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes
  const { verify2FA, request2FA } = useAuth();
  const { email } = route.params;

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleVerify = async () => {
    if (!code.trim() || code.length !== 6) {
      setError("Please enter a valid 6-digit code");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await verify2FA(email, code);
      navigation.navigate("(tabs)");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    setError(null);
    try {
      await request2FA(email);
      setCode("");
      setTimeLeft(600);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend code");
    } finally {
      setLoading(false);
    }
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Verify Your Email</Text>

        <View style={styles.emailBox}>
          <Text style={styles.emailText}>Code sent to:</Text>
          <Text style={styles.email}>{email}</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Enter 6-digit code</Text>
          <TextInput
            style={styles.input}
            placeholder="000000"
            value={code}
            onChangeText={(text) => {
              // Only allow digits, max 6
              const filtered = text.replace(/[^0-9]/g, "").slice(0, 6);
              setCode(filtered);
            }}
            editable={!loading && timeLeft > 0}
            keyboardType="number-pad"
            maxLength={6}
          />

          {error && <Text style={styles.errorText}>{error}</Text>}

          <View style={styles.timerBox}>
            <Text style={styles.timerText}>
              Expires in: {minutes}:{seconds.toString().padStart(2, "0")}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.button,
              (loading || timeLeft === 0) && styles.buttonDisabled,
            ]}
            onPress={handleVerify}
            disabled={loading || timeLeft === 0}
          >
            <Text style={styles.buttonText}>
              {loading ? "Verifying..." : "Verify Code"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resendButton}
            onPress={handleResend}
            disabled={loading}
          >
            <Text style={styles.resendText}>
              {loading ? "Sending..." : "Resend Code"}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.helpText}>
          Check your email for the verification code. It will expire in 10
          minutes.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f9ff",
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#0369a1",
    marginBottom: 24,
    textAlign: "center",
  },
  emailBox: {
    backgroundColor: "#e0f2fe",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 32,
  },
  emailText: {
    color: "#064e3b",
    fontSize: 12,
    marginBottom: 4,
  },
  email: {
    color: "#0369a1",
    fontSize: 16,
    fontWeight: "600",
  },
  form: {
    marginBottom: 32,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    fontSize: 24,
    backgroundColor: "#fff",
    letterSpacing: 8,
    textAlign: "center",
    fontWeight: "bold",
  },
  button: {
    backgroundColor: "#0369a1",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  resendButton: {
    paddingVertical: 12,
    alignItems: "center",
  },
  resendText: {
    color: "#0369a1",
    fontSize: 14,
    fontWeight: "500",
  },
  errorText: {
    color: "#dc2626",
    fontSize: 14,
    marginBottom: 12,
  },
  timerBox: {
    backgroundColor: "#fff9e6",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
  },
  timerText: {
    color: "#92400e",
    fontSize: 12,
    textAlign: "center",
    fontWeight: "500",
  },
  helpText: {
    textAlign: "center",
    color: "#64748b",
    fontSize: 13,
    lineHeight: 18,
  },
});
