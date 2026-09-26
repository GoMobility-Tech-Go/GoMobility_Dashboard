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

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

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
  async (err) => {
    const ms = Date.now() - (err.config?.metadata?.startTime || Date.now());
    const status = err.response?.status || 0;

    // 429 — respect Retry-After header, then retry once automatically
    if (status === 429) {
      const cfg = err.config;
      cfg._retryCount = (cfg._retryCount || 0) + 1;
      if (cfg._retryCount <= 2) {
        const retryAfter = parseInt(err.response?.headers?.['retry-after'] || '0', 10);
        const wait = retryAfter > 0 ? retryAfter * 1000 : cfg._retryCount * 3000; // 3s, 6s
        await sleep(wait);
        cfg.metadata = { startTime: Date.now() };
        return api(cfg);
      }
    }

    pushLog({
      id:       Date.now() + Math.random(),
      method:   err.config?.method?.toUpperCase() || 'GET',
      url:      err.config?.url || '',
      status,
      ms,
      ts:       new Date().toISOString(),
      ok:       false,
      error:    err.response?.data?.message || err.message || 'Network error',
    });

    if (status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('admin_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
