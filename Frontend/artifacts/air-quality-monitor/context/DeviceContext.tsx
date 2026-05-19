import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "./AuthContext";
import { alertApi, deviceApi, readingApi } from "../services/api.service";
import type { Alert as ApiAlert, Device as ApiDevice, SensorReading as ApiReading } from "../services/api.service";

export interface Device extends ApiDevice {}
export interface SensorReading extends ApiReading {}
export interface Alert extends ApiAlert {}

interface CurrentReading extends SensorReading {
  aqiLevel: string;
  aqiColor: string;
}

interface LoadReadingsOptions {
  silent?: boolean;
}

interface DeviceContextValue {
  devices: Device[];
  selectedDevice: Device | null;
  readings: SensorReading[];
  alerts: Alert[];
  current: CurrentReading | null;
  isDeviceOnline: boolean;
  deviceName: string;
  deviceId: string;
  lastUpdated: string;
  unreadAlerts: number;
  unreadAlertsCount: number;
  isLoading: boolean;
  error: string | null;
  selectDevice: (device: Device) => void;
  loadDevices: () => Promise<void>;
  loadReadings: (deviceId: number, options?: LoadReadingsOptions) => Promise<boolean>;
  loadAlerts: () => Promise<void>;
  refreshData: () => Promise<void>;
  createDevice: (data: { device_id: string; device_name: string }) => Promise<void>;
  updateDevice: (deviceId: number, data: { device_name: string }) => Promise<void>;
  deleteDevice: (deviceId: number) => Promise<void>;
  getDeviceOnlineStatus: (device: Device) => boolean;
  markAlertRead: (alertId: number) => Promise<void>;
  markAllAlertsRead: () => Promise<void>;
}

const DeviceContext = createContext<DeviceContextValue | undefined>(undefined);
const LIVE_REFRESH_INTERVAL_MS = 2000;
const LIVE_REFRESH_BACKOFF_MS = 15000;
const LIVE_REFRESH_FAILURES_BEFORE_BACKOFF = 3;
const DEVICE_OFFLINE_THRESHOLD_MS = 5000; // 5 seconds without data = offline

function getAqiMeta(aqi: number): { level: string; color: string } {
  if (aqi <= 50) return { level: "Good", color: "#22c55e" };
  if (aqi <= 100) return { level: "Moderate", color: "#f59e0b" };
  if (aqi <= 150) return { level: "Unhealthy for Sensitive Groups", color: "#f97316" };
  if (aqi <= 200) return { level: "Unhealthy", color: "#ef4444" };
  if (aqi <= 300) return { level: "Very Unhealthy", color: "#a855f7" };
  return { level: "Hazardous", color: "#7c3aed" };
}

/**
 * Determines device online status based on last_updated timestamp.
 * Device is considered offline if no data received in the last 5 seconds.
 */
function isDeviceOnlineStatus(device: Device | null): boolean {
  if (!device?.last_updated) return false;
  const lastUpdatedTime = new Date(device.last_updated).getTime();
  const timeSinceLastUpdate = Date.now() - lastUpdatedTime;
  return timeSinceLastUpdate <= DEVICE_OFFLINE_THRESHOLD_MS;
}

export function DeviceProvider({ children }: { children: React.ReactNode }) {
  const { accessToken, refreshAccessToken, isAuthenticated } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const liveRefreshInFlight = useRef(false);
  const liveRefreshFailures = useRef(0);
  const liveRefreshBackoffUntil = useRef(0);
  const selectedDeviceId = selectedDevice?.id;

  const withTokenRefresh = useCallback(
    async <T,>(fn: (token: string) => Promise<T>): Promise<T> => {
      if (!accessToken) throw new Error("Not authenticated");

      try {
        return await fn(accessToken);
      } catch (err: unknown) {
        const status = typeof err === "object" && err !== null && "status" in err ? (err as { status?: number }).status : undefined;
        if (status === 401) {
          const refreshedToken = await refreshAccessToken();
          if (refreshedToken) {
            return fn(refreshedToken);
          }
        }
        throw err;
      }
    },
    [accessToken, refreshAccessToken],
  );

  const loadDevices = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await withTokenRefresh((token) => deviceApi.list(token));
      setDevices(response.results);
      setSelectedDevice((currentSelected) => {
        if (response.results.length === 0) return null;
        if (!currentSelected) return response.results[0];
        return response.results.find((device) => device.id === currentSelected.id) ?? response.results[0];
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load devices");
    } finally {
      setIsLoading(false);
    }
  }, [withTokenRefresh]);

  const loadReadings = useCallback(
    async (deviceId: number, options: LoadReadingsOptions = {}) => {
      try {
        if (!options.silent) {
          setIsLoading(true);
        }
        setError(null);
        const response = await withTokenRefresh((token) => readingApi.list(token, deviceId));
        setReadings(response.results);
        const latest = response.results[0];
        if (latest) {
          const lastUpdated = latest.timestamp;
          setSelectedDevice((currentSelected) =>
            currentSelected?.id === deviceId
              ? { ...currentSelected, last_updated: lastUpdated, is_online: true }
              : currentSelected,
          );
          setDevices((currentDevices) =>
            currentDevices.map((device) =>
              device.id === deviceId
                ? { ...device, last_updated: lastUpdated, is_online: true, status: "online" }
                : device,
            ),
          );
        }
        return true;
      } catch (err) {
        if (!options.silent) {
          setError(err instanceof Error ? err.message : "Failed to load readings");
        }
        return false;
      } finally {
        if (!options.silent) {
          setIsLoading(false);
        }
      }
    },
    [withTokenRefresh],
  );

  const loadAlerts = useCallback(async () => {
    try {
      setError(null);
      const response = await withTokenRefresh((token) => alertApi.list(token));
      setAlerts(response.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load alerts");
    }
  }, [withTokenRefresh]);

  const refreshData = useCallback(async () => {
    await loadDevices();
    await loadAlerts();
    if (selectedDeviceId) {
      await loadReadings(selectedDeviceId);
    }
  }, [loadAlerts, loadDevices, loadReadings, selectedDeviceId]);

  const createDevice = useCallback(
    async (data: { device_id: string; device_name: string }) => {
      try {
        setError(null);
        await withTokenRefresh((token) => deviceApi.create(token, data));
        await loadDevices();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create device");
        throw err;
      }
    },
    [loadDevices, withTokenRefresh],
  );

  const updateDevice = useCallback(
    async (deviceId: number, data: { device_name: string }) => {
      try {
        setError(null);
        const updated = await withTokenRefresh((token) => deviceApi.update(token, deviceId, data));
        setDevices((currentDevices) =>
          currentDevices.map((device) => (device.id === deviceId ? updated : device))
        );
        setSelectedDevice((currentSelected) =>
          currentSelected?.id === deviceId ? updated : currentSelected
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update device");
        throw err;
      }
    },
    [withTokenRefresh],
  );

  const deleteDevice = useCallback(
    async (deviceId: number) => {
      try {
        setError(null);
        await withTokenRefresh((token) => deviceApi.delete(token, deviceId));
        setDevices((currentDevices) => currentDevices.filter((device) => device.id !== deviceId));
        setSelectedDevice((currentSelected) =>
          currentSelected?.id === deviceId ? null : currentSelected
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete device");
        throw err;
      }
    },
    [withTokenRefresh],
  );

  const markAlertRead = useCallback(
    async (alertId: number) => {
      try {
        await withTokenRefresh((token) => alertApi.markRead(token, alertId));
        setAlerts((previous) => previous.map((alert) => (alert.id === alertId ? { ...alert, read: true } : alert)));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to mark alert");
      }
    },
    [withTokenRefresh],
  );

  const markAllAlertsRead = useCallback(async () => {
    try {
      await withTokenRefresh((token) => alertApi.markAllRead(token));
      setAlerts((previous) => previous.map((alert) => ({ ...alert, read: true })));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark alerts");
    }
  }, [withTokenRefresh]);

  const getDeviceOnlineStatus = useCallback((device: Device) => {
    return isDeviceOnlineStatus(device);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setDevices([]);
      setSelectedDevice(null);
      setReadings([]);
      setAlerts([]);
      return;
    }

    loadDevices();
    loadAlerts();
  }, [isAuthenticated, loadAlerts, loadDevices]);

  useEffect(() => {
    if (selectedDeviceId) {
      loadReadings(selectedDeviceId);
    } else {
      setReadings([]);
    }
  }, [loadReadings, selectedDeviceId]);

  useEffect(() => {
    if (!isAuthenticated || !selectedDeviceId) return;

    const refreshLiveReadings = async () => {
      if (liveRefreshInFlight.current) return;
      if (Date.now() < liveRefreshBackoffUntil.current) return;

      liveRefreshInFlight.current = true;
      try {
        const refreshed = await loadReadings(selectedDeviceId, { silent: true });
        if (refreshed) {
          liveRefreshFailures.current = 0;
          liveRefreshBackoffUntil.current = 0;
        } else {
          liveRefreshFailures.current += 1;
          if (liveRefreshFailures.current >= LIVE_REFRESH_FAILURES_BEFORE_BACKOFF) {
            liveRefreshBackoffUntil.current = Date.now() + LIVE_REFRESH_BACKOFF_MS;
          }
        }
      } finally {
        liveRefreshInFlight.current = false;
      }
    };

    const interval = setInterval(refreshLiveReadings, LIVE_REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isAuthenticated, loadReadings, selectedDeviceId]);

  // Update device online/offline status every second based on 5-second rule
  useEffect(() => {
    if (!isAuthenticated || devices.length === 0) return;

    const updateDeviceStatus = () => {
      setDevices((currentDevices) =>
        currentDevices.map((device) => {
          const isOnline = isDeviceOnlineStatus(device);
          const currentStatus = device.status === "online";
          if (isOnline !== currentStatus) {
            return { ...device, status: isOnline ? "online" : "offline", is_online: isOnline };
          }
          return device;
        })
      );

      setSelectedDevice((currentSelected) => {
        if (!currentSelected) return null;
        const isOnline = isDeviceOnlineStatus(currentSelected);
        const currentStatus = currentSelected.status === "online";
        if (isOnline !== currentStatus) {
          return { ...currentSelected, status: isOnline ? "online" : "offline", is_online: isOnline };
        }
        return currentSelected;
      });
    };

    const interval = setInterval(updateDeviceStatus, 1000);
    return () => clearInterval(interval);
  }, [isAuthenticated, devices.length]);

  const current = useMemo<CurrentReading | null>(() => {
    if (readings.length === 0) return null;
    const latest = readings[0];
    const meta = getAqiMeta(latest.aqi);
    return {
      ...latest,
      aqiLevel: meta.level,
      aqiColor: meta.color,
    };
  }, [readings]);

  const unreadAlerts = alerts.filter((alert) => !alert.read).length;
  const lastUpdated = selectedDevice?.last_updated
    ? new Date(selectedDevice.last_updated).toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  const value: DeviceContextValue = {
    devices,
    selectedDevice,
    readings,
    alerts,
    current,
    isDeviceOnline: isDeviceOnlineStatus(selectedDevice),
    deviceName: selectedDevice?.device_name ?? "No device selected",
    deviceId: selectedDevice?.device_id ?? "N/A",
    lastUpdated,
    unreadAlerts,
    unreadAlertsCount: unreadAlerts,
    isLoading,
    error,
    selectDevice: setSelectedDevice,
    loadDevices,
    loadReadings,
    loadAlerts,
    refreshData,
    createDevice,
    updateDevice,
    deleteDevice,
    getDeviceOnlineStatus,
    markAlertRead,
    markAllAlertsRead,
  };

  return <DeviceContext.Provider value={value}>{children}</DeviceContext.Provider>;
}

export function useDevice() {
  const ctx = useContext(DeviceContext);
  if (!ctx) throw new Error("useDevice must be used within DeviceProvider");
  return ctx;
}
