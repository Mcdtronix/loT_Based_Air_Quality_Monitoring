import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Alert, useDevice } from "@/context/DeviceContext";
import { useColors } from "@/hooks/useColors";

function AlertItem({ alert, onRead }: { alert: Alert; onRead: () => void }) {
  const colors = useColors();
  const alertColor =
    alert.type === "danger"
      ? colors.destructive
      : alert.type === "warning"
      ? colors.warning
      : colors.primary;

  const iconName =
    alert.type === "danger"
      ? "alert-octagon"
      : alert.type === "warning"
      ? "alert-triangle"
      : "info";

  const timeStr = new Date(alert.timestamp).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <TouchableOpacity
      style={[
        styles.alertItem,
        {
          backgroundColor: colors.card,
          borderColor: alert.read ? colors.border : `${alertColor}40`,
          borderLeftColor: alertColor,
        },
      ]}
      onPress={onRead}
      activeOpacity={0.8}
    >
      <View style={[styles.iconBox, { backgroundColor: `${alertColor}15` }]}>
        <Feather name={iconName} size={20} color={alertColor} />
      </View>
      <View style={styles.alertContent}>
        <View style={styles.alertTopRow}>
          <Text style={[styles.alertType, { color: alertColor }]}>
            {alert.type === "danger" ? "Danger" : alert.type === "warning" ? "Warning" : "Info"}
          </Text>
          <Text style={[styles.alertTime, { color: colors.mutedForeground }]}>{timeStr}</Text>
        </View>
        <Text style={[styles.alertMsg, { color: colors.foreground }]}>{alert.message}</Text>
        <View style={styles.alertBottom}>
          <View style={[styles.aqiBadge, { backgroundColor: `${alertColor}15` }]}>
            <Text style={[styles.aqiBadgeText, { color: alertColor }]}>AQI: {alert.aqi}</Text>
          </View>
          {!alert.read && (
            <View style={[styles.unreadDot, { backgroundColor: alertColor }]} />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function AlertsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { alerts, markAlertRead, markAllAlertsRead, unreadAlerts } = useDevice();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const handleMarkAll = () => {
    markAllAlertsRead();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: topPad + 12, borderBottomColor: colors.border, backgroundColor: colors.background },
        ]}
      >
        <View>
          <Text style={[styles.pageTitle, { color: colors.foreground }]}>Alerts</Text>
          {unreadAlerts > 0 && (
            <Text style={[styles.pageSub, { color: colors.mutedForeground }]}>
              {unreadAlerts} unread notification{unreadAlerts > 1 ? "s" : ""}
            </Text>
          )}
        </View>
        {unreadAlerts > 0 && (
          <TouchableOpacity
            onPress={handleMarkAll}
            style={[styles.markAllBtn, { borderColor: colors.primary }]}
          >
            <Feather name="check-square" size={14} color={colors.primary} />
            <Text style={[styles.markAllText, { color: colors.primary }]}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={alerts}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[
          styles.list,
          {
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 84) + 16,
          },
        ]}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        renderItem={({ item }) => (
          <AlertItem alert={item} onRead={() => markAlertRead(item.id)} />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: `${colors.success}12` }]}>
              <Feather name="bell-off" size={40} color={colors.success} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              No Alerts
            </Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
              You're all clear! Alerts will appear here when air quality changes significantly.
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
        scrollEnabled={alerts.length > 0}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  pageTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
  },
  pageSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    marginTop: 2,
  },
  markAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  markAllText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  list: {
    padding: 16,
  },
  alertItem: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: 12,
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  alertContent: {
    flex: 1,
    gap: 4,
  },
  alertTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  alertType: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  alertTime: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
  },
  alertMsg: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 18,
  },
  alertBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  aqiBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  aqiBadgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 80,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
  },
  emptySub: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});
