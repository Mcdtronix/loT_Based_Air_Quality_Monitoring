// Environment configuration
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
const API_ENDPOINT = `${API_BASE_URL}/api`;

export const API_CONFIG = {
  BASE_URL: API_BASE_URL,
  API_ENDPOINT,
  HEALTH_CHECK: `${API_ENDPOINT}/healthz/`,
  AUTH_REGISTER: `${API_ENDPOINT}/auth/register/`,
  AUTH_LOGIN: `${API_ENDPOINT}/auth/login/`,
  AUTH_2FA_REQUEST: `${API_ENDPOINT}/auth/2fa/request/`,
  AUTH_2FA_VERIFY: `${API_ENDPOINT}/auth/2fa/verify/`,
  AUTH_TOKEN_REFRESH: `${API_ENDPOINT}/token/refresh/`,
  DEVICES_LIST: `${API_ENDPOINT}/devices/`,
  READINGS_LIST: `${API_ENDPOINT}/readings/`,
  READINGS_SUBMIT: `${API_ENDPOINT}/readings/`,
  ALERTS_LIST: `${API_ENDPOINT}/alerts/`,
  PROFILES_LIST: `${API_ENDPOINT}/profiles/`,
};

// Token expiration times
export const TOKEN_CONFIG = {
  ACCESS_TOKEN_EXPIRY: 60 * 60 * 1000, // 60 minutes
  REFRESH_TOKEN_EXPIRY: 7 * 24 * 60 * 60 * 1000, // 7 days
  TWO_FA_EXPIRY: 10 * 60 * 1000, // 10 minutes
};

export default API_CONFIG;
