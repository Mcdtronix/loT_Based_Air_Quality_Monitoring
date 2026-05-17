import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface Props {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
  unit: string;
  color?: string;
  status?: "good" | "moderate" | "bad";
}

export function SensorCard({ icon, label, value, unit, color, status }: Props) {
  const colors = useColors();
  const statusColor =
    status === "good"
      ? colors.success
      : status === "moderate"
      ? colors.warning
      : status === "bad"
      ? colors.destructive
      : color ?? colors.primary;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View
        style={[styles.iconWrap, { backgroundColor: `${statusColor}18` }]}
      >
        <Feather name={icon} size={20} color={statusColor} />
      </View>
      <Text
        style={[styles.value, { color: statusColor }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      <Text style={[styles.unit, { color: colors.mutedForeground }]}>{unit}</Text>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    alignItems: "center",
    gap: 4,
    flex: 1,
    minWidth: 80,
  },
  iconWrap: {
    borderRadius: 8,
    padding: 8,
    marginBottom: 2,
  },
  value: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    lineHeight: 26,
  },
  unit: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    marginTop: -2,
  },
  label: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    textAlign: "center",
  },
});
