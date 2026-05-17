import { API_CONFIG } from "../config/api.config";

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone: string;
  medical_condition: string;
  created_at: string;
}

export interface AuthResponse {
  message: string;
  refresh: string;
  access: string;
  user: User;
}

export interface TwoFactorChallenge {
  message: string;
  session_token: string;
  email?: string;
}

export interface RegisterPayload {
  full_name: string;
  email: string;
  phone: string;
  password: string;
  confirm_password: string;
  medical_condition: string;
}

export interface Device {
  id: number;
  device_id: string;
  device_name: string;
  is_online: boolean;
  status: "online" | "offline";
  last_reading: {
    aqi: number;
    timestamp: string;
  } | null;
  last_updated?: string | null;
  created_at?: string;
}

export interface SensorReading {
  id: number;
  device: number;
  timestamp: string;
  pm25: number;
  pm10: number;
  co2: number;
  carbon_monoxide: number;
  nitrogen_oxide: number;
  humidity: number;
  temperature: number;
  dust: number;
  dust_density: number;
  aqi: number;
}

export interface Alert {
  id: number;
  device: number;
  timestamp: string;
  alert_type: "warning" | "danger" | "info";
  type: "warning" | "danger" | "info";
  title: string;
  message: string;
  aqi: number;
  read: boolean;
}

export interface Profile {
  user: User;
  phone: string;
  medical_condition: string;
  created_at: string;
  two_factor_enabled: boolean;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function normalizeReading(reading: SensorReading): SensorReading {
  return {
    ...reading,
    carbon_monoxide: reading.carbon_monoxide ?? 0,
    nitrogen_oxide: reading.nitrogen_oxide ?? 0,
    dust_density: reading.dust_density ?? reading.dust ?? 0,
    dust: reading.dust ?? reading.dust_density ?? 0,
  };
}

function normalizeDevice(device: Device): Device {
  return {
    ...device,
    last_reading: device.last_reading ?? null,
  };
}

async function apiCall<T>(
  url: string,
  options?: RequestInit & { accessToken?: string },
): Promise<T> {
  const { accessToken, ...fetchOptions } = options || {};

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(fetchOptions.headers as Record<string, string> | undefined),
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new ApiError(response.status, "API request failed", data);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const authApi = {
  register: async (payload: RegisterPayload) =>
    apiCall<TwoFactorChallenge>(API_CONFIG.AUTH_REGISTER, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  login: async (email: string, password: string) =>
    apiCall<AuthResponse | TwoFactorChallenge>(API_CONFIG.AUTH_LOGIN, {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  request2FA: async (email: string) =>
    apiCall<TwoFactorChallenge>(API_CONFIG.AUTH_2FA_REQUEST, {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  verify2FA: async (email: string, token: string) =>
    apiCall<AuthResponse>(API_CONFIG.AUTH_2FA_VERIFY, {
      method: "POST",
      body: JSON.stringify({ email, token }),
    }),

  refreshToken: async (refreshToken: string) =>
    apiCall<{ access: string }>(API_CONFIG.AUTH_TOKEN_REFRESH, {
      method: "POST",
      body: JSON.stringify({ refresh: refreshToken }),
    }),
};

export const deviceApi = {
  list: async (accessToken: string) => {
    const response = await apiCall<{ results: Device[]; count: number }>(API_CONFIG.DEVICES_LIST, {
      method: "GET",
      accessToken,
    });
    return {
      ...response,
      results: response.results.map(normalizeDevice),
    };
  },

  get: async (accessToken: string, deviceId: number) => {
    const response = await apiCall<Device>(`${API_CONFIG.DEVICES_LIST}${deviceId}/`, {
      method: "GET",
      accessToken,
    });
    return normalizeDevice(response);
  },

  create: async (
    accessToken: string,
    data: { device_id: string; device_name: string },
  ) =>
    apiCall<Device>(API_CONFIG.DEVICES_LIST, {
      method: "POST",
      body: JSON.stringify(data),
      accessToken,
    }).then(normalizeDevice),

  update: async (
    accessToken: string,
    deviceId: number,
    data: Partial<Pick<Device, "device_name" | "is_online">>,
  ) =>
    apiCall<Device>(`${API_CONFIG.DEVICES_LIST}${deviceId}/`, {
      method: "PATCH",
      body: JSON.stringify(data),
      accessToken,
    }).then(normalizeDevice),

  delete: async (accessToken: string, deviceId: number) =>
    apiCall<void>(`${API_CONFIG.DEVICES_LIST}${deviceId}/`, {
      method: "DELETE",
      accessToken,
    }),
};

export const readingApi = {
  list: async (accessToken: string, deviceId?: number) => {
    const url = deviceId
      ? `${API_CONFIG.READINGS_LIST}?device=${deviceId}`
      : API_CONFIG.READINGS_LIST;
    const response = await apiCall<{ results: SensorReading[]; count: number }>(url, {
      method: "GET",
      accessToken,
    });
    return {
      ...response,
      results: response.results.map(normalizeReading),
    };
  },

  create: async (
    accessToken: string,
    data: Omit<SensorReading, "id" | "timestamp" | "aqi" | "dust">,
  ) => {
    const response = await apiCall<SensorReading>(API_CONFIG.READINGS_SUBMIT, {
      method: "POST",
      body: JSON.stringify(data),
      accessToken,
    });
    return normalizeReading(response);
  },
};

export const alertApi = {
  list: async (accessToken: string) =>
    apiCall<{ results: Alert[]; count: number }>(API_CONFIG.ALERTS_LIST, {
      method: "GET",
      accessToken,
    }),

  markRead: async (accessToken: string, alertId: number) =>
    apiCall<{ status: string }>(`${API_CONFIG.ALERTS_LIST}${alertId}/mark_read/`, {
      method: "POST",
      accessToken,
    }),

  markAllRead: async (accessToken: string) =>
    apiCall<{ status: string }>(`${API_CONFIG.ALERTS_LIST}mark_all_read/`, {
      method: "POST",
      accessToken,
    }),
};

export const profileApi = {
  list: async (accessToken: string) =>
    apiCall<{ results: Profile[]; count: number }>(API_CONFIG.PROFILES_LIST, {
      method: "GET",
      accessToken,
    }),
};
