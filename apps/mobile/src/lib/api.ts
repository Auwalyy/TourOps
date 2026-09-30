import axios, { AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';

export const ACCESS_TOKEN_KEY = 'tourops.accessToken';
export const REFRESH_TOKEN_KEY = 'tourops.refreshToken';

export async function getToken(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

export async function setTokens(accessToken: string, refreshToken?: string): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
}

export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY).catch(() => {});
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY).catch(() => {});
}

const api = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  // Render's free tier sleeps after idling and takes ~30s to wake. A shorter
  // timeout makes the first request of the morning fail for no real reason.
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await getToken(ACCESS_TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/**
 * Called when the refresh token is rejected too. Set by the auth store so this
 * module does not have to import it and create a cycle.
 */
let onSessionExpired: (() => void) | null = null;
export function setSessionExpiredHandler(fn: () => void) {
  onSessionExpired = fn;
}

/**
 * A single in-flight refresh shared by every request that 401s at once — a
 * screen with four queries would otherwise fire four refreshes and invalidate
 * each other's tokens.
 */
let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await getToken(REFRESH_TOKEN_KEY);
  if (!refreshToken) return null;

  try {
    // Bare axios: the instance's interceptor would attach the dead token.
    const { data } = await axios.post(`${BASE_URL}/api/v1/auth/refresh`, { refreshToken });
    const next = data?.data?.accessToken;
    if (!next) return null;
    await setTokens(next, data?.data?.refreshToken);
    return next;
  } catch {
    return null;
  }
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original: any = error.config;
    const status = error.response?.status;

    const isAuthRoute = typeof original?.url === 'string' && original.url.startsWith('/auth/');

    if (status === 401 && original && !original._retry && !isAuthRoute) {
      original._retry = true;

      refreshing = refreshing || refreshAccessToken().finally(() => {
        refreshing = null;
      });
      const token = await refreshing;

      if (token) {
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      }

      await clearTokens();
      onSessionExpired?.();
    }

    return Promise.reject(error);
  }
);

/** The API always answers `{ success, message, details? }` on failure. */
export function errorMessage(e: unknown, fallback = 'Something went wrong'): string {
  const err = e as AxiosError<{ message?: string }>;
  if (err?.code === 'ECONNABORTED') {
    return 'The server is taking too long to respond. It may be waking up — try again.';
  }
  if (err?.message === 'Network Error') {
    return 'Cannot reach the server. Check your connection.';
  }
  return err?.response?.data?.message || fallback;
}

/** 403 responses carry this when the agency's plan does not include a feature. */
export function isUpgradeRequired(e: unknown): boolean {
  const err = e as AxiosError<{ details?: { upgradeRequired?: boolean } }>;
  return err?.response?.status === 403 && !!err.response.data?.details?.upgradeRequired;
}

export default api;
