import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface Props {
  aqi: number;
  level: string;
  color: string;
  size?: "small" | "large";
}

export function AqiGauge({ aqi, level, color, size = "large" }: Props) {
  const colors = useColors();
  const isLarge = size === "large";
  const circleSize = isLarge ? 160 : 100;
  const fontSize = isLarge ? 48 : 28;

  const percentage = Math.min(aqi / 300, 1);
  const segments = [
    { max: 50, color: "#22c55e", label: "Good" },
    { max: 100, color: "#f59e0b", label: "Moderate" },
    { max: 150, color: "#f97316", label: "USG" },
    { max: 200, color: "#ef4444", label: "Unhealthy" },
    { max: 300, color: "#7c3aed", label: "Hazardous" },
  ];

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.circle,
          {
            width: circleSize,
            height: circleSize,
            borderRadius: circleSize / 2,
            borderColor: color,
            backgroundColor: `${color}18`,
          },
        ]}
      >
        <View style={[styles.innerCircle, { borderColor: `${color}40` }]}>
          <Text style={[styles.aqiNumber, { fontSize, color }]}>{aqi}</Text>
          <Text style={[styles.aqiLabel, { color: colors.mutedForeground }]}>
            AQI
          </Text>
        </View>
      </View>
      {isLarge && (
        <>
          <Text style={[styles.levelText, { color }]}>{level}</Text>
          <View style={styles.scaleBar}>
            {segments.map((s, i) => (
              <View
                key={i}
                style={[
                  styles.scaleSegment,
                  { backgroundColor: s.color, opacity: aqi > (i === 0 ? 0 : segments[i - 1].max) ? 1 : 0.3 },
                ]}
              />
            ))}
          </View>
          <View style={styles.scaleLabels}>
            <Text style={[styles.scaleLabel, { color: colors.mutedForeground }]}>0</Text>
            <Text style={[styles.scaleLabel, { color: colors.mutedForeground }]}>50</Text>
            <Text style={[styles.scaleLabel, { color: colors.mutedForeground }]}>100</Text>
            <Text style={[styles.scaleLabel, { color: colors.mutedForeground }]}>150</Text>
            <Text style={[styles.scaleLabel, { color: colors.mutedForeground }]}>200</Text>
            <Text style={[styles.scaleLabel, { color: colors.mutedForeground }]}>300</Text>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 8,
  },
  circle: {
    borderWidth: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  innerCircle: {
    borderWidth: 2,
    borderRadius: 999,
    width: "80%",
    height: "80%",
    alignItems: "center",
    justifyContent: "center",
  },
  aqiNumber: {
    fontFamily: "Inter_700Bold",
    lineHeight: undefined,
  },
  aqiLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    marginTop: -4,
  },
  levelText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    textAlign: "center",
  },
  scaleBar: {
    flexDirection: "row",
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    width: 200,
    gap: 1,
  },
  scaleSegment: {
    flex: 1,
    borderRadius: 2,
  },
  scaleLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: 200,
  },
  scaleLabel: {
    fontSize: 9,
    fontFamily: "Inter_400Regular",
  },
});
