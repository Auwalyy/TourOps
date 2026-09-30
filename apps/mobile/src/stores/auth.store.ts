import { create } from 'zustand';
import { User } from '@/types';
import api, {
  ACCESS_TOKEN_KEY,
  clearTokens,
  getToken,
  setSessionExpiredHandler,
  setTokens,
} from '@/lib/api';
import { authApi } from '@/services/api.service';

interface AuthState {
  user: User | null;
  /** False until the stored session has been checked, so the router does not
   *  bounce a signed-in user to the login screen on cold start. */
  ready: boolean;
  isAuthenticated: boolean;
  restore: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  ready: false,
  isAuthenticated: false,

  /** Reads the stored token and confirms it is still good before trusting it. */
  restore: async () => {
    const token = await getToken(ACCESS_TOKEN_KEY);
    if (!token) {
      set({ ready: true, user: null, isAuthenticated: false });
      return;
    }
    try {
      const { data } = await authApi.me();
      set({ user: data.data, isAuthenticated: true, ready: true });
    } catch {
      // The interceptor already tried to refresh; if we are here it failed.
      await clearTokens();
      set({ user: null, isAuthenticated: false, ready: true });
    }
  },

  login: async (email, password) => {
    const { data } = await authApi.login(email.trim(), password);
    const { accessToken, refreshToken, user } = data.data;
    await setTokens(accessToken, refreshToken);
    set({ user, isAuthenticated: true, ready: true });
  },

  logout: async () => {
    try {
      await authApi.logout();
    } catch {
      // Signing out locally matters more than telling the server.
    }
    await clearTokens();
    set({ user: null, isAuthenticated: false });
  },
}));

// Wired here rather than in the api module to avoid an import cycle.
setSessionExpiredHandler(() => {
  useAuthStore.setState({ user: null, isAuthenticated: false });
});

export function isOwner(user: User | null): boolean {
  return user?.role === 'agency_owner' || user?.role === 'system_admin';
}
