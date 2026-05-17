import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

import { TOKEN_CONFIG } from "../config/api.config";
import { authApi, ApiError } from "../services/api.service";

export interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone: string;
  medicalCondition: string;
  createdAt: string;
}

export interface RegisterData {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  medicalCondition: string;
}

interface StoredAuth {
  accessToken: string;
  refreshToken: string;
  user: User;
  expiresAt: number;
}

interface AuthFlowResult {
  requiresVerification: boolean;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  accessToken: string | null;
  request2FA: (email: string) => Promise<{ sessionToken: string }>;
  verify2FA: (email: string, code: string) => Promise<void>;
  login: (email: string, password: string) => Promise<AuthFlowResult>;
  register: (data: RegisterData) => Promise<AuthFlowResult>;
  verifyOtp: (email: string, code: string) => Promise<void>;
  resendOtp: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<string | null>;
}

const STORAGE_KEY_AUTH = "@airguard_auth";
const STORAGE_KEY_REFRESH_TOKEN = "@airguard_refresh_token";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function mapApiUser(user: {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone: string;
  medical_condition: string;
  created_at: string;
}): User {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    fullName: user.full_name,
    phone: user.phone,
    medicalCondition: user.medical_condition,
    createdAt: user.created_at,
  };
}

function getApiErrorMessage(error: ApiError, fallback: string): string {
  const data = error.data as Record<string, unknown> | undefined;
  if (!data) return fallback;

  const entries = Object.values(data);
  for (const entry of entries) {
    if (typeof entry === "string") return entry;
    if (Array.isArray(entry) && typeof entry[0] === "string") return entry[0];
  }
  return fallback;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const saveAuth = useCallback(async (nextAccessToken: string, refreshToken: string, nextUser: User) => {
    const auth: StoredAuth = {
      accessToken: nextAccessToken,
      refreshToken,
      user: nextUser,
      expiresAt: Date.now() + TOKEN_CONFIG.ACCESS_TOKEN_EXPIRY,
    };
    await AsyncStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(auth));
    await AsyncStorage.setItem(STORAGE_KEY_REFRESH_TOKEN, refreshToken);
  }, []);

  const clearAuth = useCallback(async () => {
    setUser(null);
    setAccessToken(null);
    await AsyncStorage.removeItem(STORAGE_KEY_AUTH);
    await AsyncStorage.removeItem(STORAGE_KEY_REFRESH_TOKEN);
  }, []);

  const applyAuthResponse = useCallback(
    async (response: { access: string; refresh: string; user: Parameters<typeof mapApiUser>[0] }) => {
      const mappedUser = mapApiUser(response.user);
      await saveAuth(response.access, response.refresh, mappedUser);
      setUser(mappedUser);
      setAccessToken(response.access);
    },
    [saveAuth],
  );

  useEffect(() => {
    const loadAuth = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY_AUTH);
        const refreshToken = await AsyncStorage.getItem(STORAGE_KEY_REFRESH_TOKEN);

        if (!stored || !refreshToken) {
          return;
        }

        const auth: StoredAuth = JSON.parse(stored);
        if (auth.expiresAt > Date.now()) {
          setUser(auth.user);
          setAccessToken(auth.accessToken);
          return;
        }

        const refreshedToken = await authApi.refreshToken(refreshToken);
        await saveAuth(refreshedToken.access, refreshToken, auth.user);
        setUser(auth.user);
        setAccessToken(refreshedToken.access);
      } catch (error) {
        console.error("Failed to load auth:", error);
        await clearAuth();
      } finally {
        setIsLoading(false);
      }
    };

    loadAuth();
  }, [clearAuth, saveAuth]);

  const request2FA = useCallback(async (email: string) => {
    try {
      const response = await authApi.request2FA(email.trim().toLowerCase());
      return { sessionToken: response.session_token };
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(getApiErrorMessage(error, "Failed to send verification code"));
      }
      throw error;
    }
  }, []);

  const verify2FA = useCallback(
    async (email: string, code: string) => {
      try {
        const response = await authApi.verify2FA(email.trim().toLowerCase(), code);
        await applyAuthResponse(response);
      } catch (error) {
        if (error instanceof ApiError) {
          throw new Error(getApiErrorMessage(error, "Verification failed"));
        }
        throw error;
      }
    },
    [applyAuthResponse],
  );

  const verifyOtp = useCallback(
    async (email: string, code: string) => {
      try {
        await authApi.verify2FA(email.trim().toLowerCase(), code);
        await clearAuth();
      } catch (error) {
        if (error instanceof ApiError) {
          throw new Error(getApiErrorMessage(error, "Verification failed"));
        }
        throw error;
      }
    },
    [clearAuth],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const response = await authApi.login(email.trim().toLowerCase(), password);
        if ("access" in response) {
          await applyAuthResponse(response);
          return { requiresVerification: false };
        }
        return { requiresVerification: true };
      } catch (error) {
        if (error instanceof ApiError) {
          throw new Error(getApiErrorMessage(error, "Login failed"));
        }
        throw error;
      }
    },
    [applyAuthResponse],
  );

  const register = useCallback(async (data: RegisterData) => {
    try {
      await authApi.register({
        full_name: data.fullName.trim(),
        email: data.email.trim().toLowerCase(),
        phone: data.phone.trim(),
        password: data.password,
        confirm_password: data.confirmPassword,
        medical_condition: data.medicalCondition,
      });
      return { requiresVerification: true };
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(getApiErrorMessage(error, "Registration failed"));
      }
      throw error;
    }
  }, []);

  const resendOtp = useCallback(async (email: string) => {
    await request2FA(email);
  }, [request2FA]);

  const logout = useCallback(async () => {
    await clearAuth();
  }, [clearAuth]);

  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    try {
      const refreshToken = await AsyncStorage.getItem(STORAGE_KEY_REFRESH_TOKEN);
      if (!refreshToken) return null;

      const response = await authApi.refreshToken(refreshToken);
      if (!user) return null;

      await saveAuth(response.access, refreshToken, user);
      setAccessToken(response.access);
      return response.access;
    } catch {
      await clearAuth();
      return null;
    }
  }, [clearAuth, saveAuth, user]);

  const value: AuthContextValue = {
    user,
    isLoading,
    isAuthenticated: !!user && !!accessToken,
    accessToken,
    request2FA,
    verify2FA,
    login,
    register,
    verifyOtp,
    resendOtp,
    logout,
    refreshAccessToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
