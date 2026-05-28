import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useMemo, useState } from "react";
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
import { sortAlerts, filterAlerts, calculateAlertStats, formatAlertTime, getAlertAction } from "@/services/alert.service";

type AlertFilter = "all" | "unread" | "critical";

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

  const relativeTime = formatAlertTime(alert.timestamp);
  const recommendation = getAlertAction(alert.type);

  return (
    <TouchableOpacity
      style={[
        styles.alertItem,
        {
          backgroundColor: colors.card,
          borderColor: alert.read ? colors.border : `${alertColor}40`,
          borderLeftColor: alertColor,
          opacity: alert.read ? 0.6 : 1,
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
            {alert.type === "danger" ? "🚨 DANGER" : alert.type === "warning" ? "⚠️ WARNING" : "ℹ️ INFO"}
          </Text>
          <Text style={[styles.alertTime, { color: colors.mutedForeground }]}>{relativeTime}</Text>
        </View>
        <Text style={[styles.alertMsg, { color: colors.foreground }]} numberOfLines={2}>
          {alert.message}
        </Text>
        <Text style={[styles.alertRecommendation, { color: colors.mutedForeground }]} numberOfLines={1}>
          {recommendation}
        </Text>
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

function FilterButton({
  label,
  isActive,
  onPress,
  count,
  colors,
}: {
  label: string;
  isActive: boolean;
  onPress: () => void;
  count?: number;
  colors: any;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.filterBtn,
        {
          backgroundColor: isActive ? colors.primary : colors.card,
          borderColor: isActive ? colors.primary : colors.border,
        },
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.filterBtnText,
          {
            color: isActive ? colors.background : colors.foreground,
            fontFamily: isActive ? "Inter_600SemiBold" : "Inter_500Medium",
          },
        ]}
      >
        {label}
        {count !== undefined && count > 0 ? ` (${count})` : ""}
      </Text>
    </TouchableOpacity>
  );
}

export default function AlertsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { alerts, markAlertRead, markAllAlertsRead, unreadAlerts } = useDevice();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  // ✅ State for filtering and sorting
  const [activeFilter, setActiveFilter] = useState<AlertFilter>("unread");

  // ✅ Calculate statistics
  const stats = useMemo(() => calculateAlertStats(alerts), [alerts]);
  
  // ✅ Apply filtering and sorting
  const filteredAndSortedAlerts = useMemo(() => {
    let filtered = alerts;

    switch (activeFilter) {
      case "unread":
        filtered = alerts.filter((a) => !a.read);
        break;
      case "critical":
        filtered = alerts.filter((a) => a.type === "danger" && !a.read);
        break;
      case "all":
      default:
        filtered = alerts;
        break;
    }

    return sortAlerts(filtered);
  }, [alerts, activeFilter]);

  const handleMarkAll = () => {
    markAllAlertsRead();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleAlertPress = (alertId: number) => {
    markAlertRead(alertId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header with title and stats */}
      <View
        style={[
          styles.header,
          { paddingTop: topPad + 12, borderBottomColor: colors.border, backgroundColor: colors.background },
        ]}
      >
        <View style={styles.headerLeft}>
          <Text style={[styles.pageTitle, { color: colors.foreground }]}>Alerts</Text>
          <Text style={[styles.pageSub, { color: colors.mutedForeground }]}>
            {stats.unread} unread • {stats.total} total
          </Text>
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

      {/* Filter buttons */}
      <View style={[styles.filterContainer, { borderBottomColor: colors.border }]}>
        <View style={styles.filterScroll}>
          <FilterButton
            label="Unread"
            isActive={activeFilter === "unread"}
            onPress={() => setActiveFilter("unread")}
            count={stats.unread}
            colors={colors}
          />
          <FilterButton
            label="Critical"
            isActive={activeFilter === "critical"}
            onPress={() => setActiveFilter("critical")}
            count={stats.critical}
            colors={colors}
          />
          <FilterButton
            label="All"
            isActive={activeFilter === "all"}
            onPress={() => setActiveFilter("all")}
            count={stats.total}
            colors={colors}
          />
        </View>
      </View>

      {/* Alerts list */}
      <FlatList
        data={filteredAndSortedAlerts}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[
          styles.list,
          {
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 84) + 16,
          },
        ]}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        renderItem={({ item }) => (
          <AlertItem alert={item} onRead={() => handleAlertPress(item.id)} />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: `${colors.success}12` }]}>
              <Feather name="bell-off" size={40} color={colors.success} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              {activeFilter === "critical" ? "No Critical Alerts" : "All Caught Up!"}
            </Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
              {activeFilter === "critical"
                ? "No critical alerts. Air quality is stable."
                : "No alerts to display. Air quality looks good!"}
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
        scrollEnabled={filteredAndSortedAlerts.length > 0}
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
  headerLeft: {
    flex: 1,
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
  // ✅ Filter styles
  filterContainer: {
    borderBottomWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  filterScroll: {
    flexDirection: "row",
    gap: 8,
  },
  filterBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  filterBtnText: {
    fontSize: 12,
    lineHeight: 16,
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
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    lineHeight: 18,
  },
  // ✅ New recommendation style
  alertRecommendation: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 16,
    fontStyle: "italic",
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
