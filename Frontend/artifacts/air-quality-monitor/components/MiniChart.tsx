import React from "react";
import { StyleSheet, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface Props {
  data: number[];
  color: string;
  height?: number;
}

export function MiniChart({ data, color, height = 50 }: Props) {
  const colors = useColors();
  if (!data || data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const normalized = data.map((v) => (v - min) / range);

  return (
    <View style={[styles.container, { height }]}>
      {normalized.map((v, i) => (
        <View
          key={i}
          style={[
            styles.bar,
            {
              height: Math.max(4, v * height),
              backgroundColor: color,
              opacity: 0.3 + v * 0.7,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
    overflow: "hidden",
  },
  bar: {
    flex: 1,
    borderRadius: 2,
    minHeight: 4,
  },
});
