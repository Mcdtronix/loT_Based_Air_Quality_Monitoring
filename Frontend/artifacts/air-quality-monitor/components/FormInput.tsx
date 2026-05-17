import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";

interface Props extends TextInputProps {
  label: string;
  error?: string;
  icon?: keyof typeof Feather.glyphMap;
  isPassword?: boolean;
  required?: boolean;
}

export function FormInput({
  label,
  error,
  icon,
  isPassword,
  required,
  style,
  ...rest
}: Props) {
  const colors = useColors();
  const [focused, setFocused] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const borderColor = error
    ? colors.destructive
    : focused
    ? colors.primary
    : colors.border;

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: colors.foreground }]}>
        {label}
        {required && (
          <Text style={{ color: colors.destructive }}> *</Text>
        )}
      </Text>
      <View
        style={[
          styles.row,
          {
            borderColor,
            backgroundColor: colors.card,
          },
        ]}
      >
        {icon && (
          <Feather
            name={icon}
            size={18}
            color={focused ? colors.primary : colors.mutedForeground}
            style={styles.icon}
          />
        )}
        <TextInput
          style={[styles.input, { color: colors.foreground }, style]}
          placeholderTextColor={colors.mutedForeground}
          secureTextEntry={isPassword && !showPw}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoCapitalize={isPassword ? "none" : rest.autoCapitalize}
          {...rest}
        />
        {isPassword && (
          <TouchableOpacity
            onPress={() => setShowPw(!showPw)}
            style={styles.eyeBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather
              name={showPw ? "eye-off" : "eye"}
              size={18}
              color={colors.mutedForeground}
            />
          </TouchableOpacity>
        )}
      </View>
      {error ? (
        <View style={styles.errorRow}>
          <Feather name="alert-circle" size={12} color={colors.destructive} />
          <Text style={[styles.errorText, { color: colors.destructive }]}>
            {error}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 6,
  },
  label: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    minHeight: 50,
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    paddingVertical: 12,
  },
  eyeBtn: {
    padding: 4,
    marginLeft: 8,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  errorText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
});
