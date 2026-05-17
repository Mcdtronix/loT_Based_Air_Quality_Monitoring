import * as Haptics from "expo-haptics";
import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableOpacityProps,
} from "react-native";
import { useColors } from "@/hooks/useColors";

interface Props extends TouchableOpacityProps {
  title: string;
  loading?: boolean;
  variant?: "primary" | "outline" | "ghost";
}

export function PrimaryButton({
  title,
  loading,
  variant = "primary",
  disabled,
  onPress,
  style,
  ...rest
}: Props) {
  const colors = useColors();

  const handlePress = (e: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress?.(e);
  };

  const bg =
    variant === "primary"
      ? colors.primary
      : variant === "outline"
      ? "transparent"
      : "transparent";
  const borderColor =
    variant === "outline" ? colors.primary : "transparent";
  const textColor =
    variant === "primary"
      ? colors.primaryForeground
      : colors.primary;

  return (
    <TouchableOpacity
      style={[
        styles.btn,
        { backgroundColor: bg, borderColor, borderWidth: variant === "outline" ? 1.5 : 0 },
        (disabled || loading) && styles.disabled,
        style,
      ]}
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <Text style={[styles.text, { color: textColor }]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  disabled: {
    opacity: 0.6,
  },
  text: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
});
