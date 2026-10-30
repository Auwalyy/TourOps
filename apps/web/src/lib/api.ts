import axios, { AxiosError } from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
});

// Inject access token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * One refresh in flight at a time. A page fires several requests at once, so
 * when the access token expires they all 401 together; if each refreshed on
 * its own, the first would rotate the refresh token and the rest would be
 * rejected with the now-revoked one — logging the user out for no reason.
 */
let refreshing: Promise<string> | null = null;

function refreshAccessToken(): Promise<string> {
  if (!refreshing) {
    refreshing = axios
      .post('/api/v1/auth/refresh', {}, { withCredentials: true, timeout: 20000 })
      .then(({ data }) => {
        const token = data.data.accessToken as string;
        localStorage.setItem('accessToken', token);
        return token;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

/** Ends the session locally and sends the user to sign in, back to where they were. */
function endSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('accessToken');
  // The persisted store would otherwise still say "signed in" and bounce
  // straight back off the login page.
  localStorage.removeItem('ops-auth');
  if (!window.location.pathname.startsWith('/login')) {
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/login?next=${next}`;
  }
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as (typeof error.config & { _retry?: boolean }) | undefined;
    const isAuthRoute = original?.url?.startsWith('/auth/');
    if (error.response?.status === 401 && original && !original._retry && !isAuthRoute) {
      original._retry = true;
      try {
        const token = await refreshAccessToken();
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch (refreshError) {
        // Only a definite "your session is over" signs the user out. A dropped
        // connection, timeout or server hiccup just fails this one request.
        const status = (refreshError as AxiosError)?.response?.status;
        if (status === 401) endSession();
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
