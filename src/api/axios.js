import axios from 'axios';

// ── Session-level API call tracker ───────────────────────────────────────────
// Module-level so it survives component unmounts. Max 150 entries.
const MAX_LOGS = 150;
export const apiCallLog = [];

export function getApiCallLog() { return apiCallLog; }

const pushLog = (entry) => {
  apiCallLog.unshift(entry);
  if (apiCallLog.length > MAX_LOGS) apiCallLog.length = MAX_LOGS;
};

// ── Axios instance ────────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: 'https://api.gomobility.co.in/api/v1',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.metadata = { startTime: Date.now() };
  return config;
});

api.interceptors.response.use(
  (res) => {
    const ms = Date.now() - (res.config.metadata?.startTime || Date.now());
    pushLog({
      id:       Date.now() + Math.random(),
      method:   res.config.method?.toUpperCase() || 'GET',
      url:      res.config.url || '',
      status:   res.status,
      ms,
      ts:       new Date().toISOString(),
      ok:       true,
    });
    return res;
  },
  (err) => {
    const ms = Date.now() - (err.config?.metadata?.startTime || Date.now());
    pushLog({
      id:       Date.now() + Math.random(),
      method:   err.config?.method?.toUpperCase() || 'GET',
      url:      err.config?.url || '',
      status:   err.response?.status || 0,
      ms,
      ts:       new Date().toISOString(),
      ok:       false,
      error:    err.response?.data?.message || err.message || 'Network error',
    });
    if (err.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('admin_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
