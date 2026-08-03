import api from './axios';

const BASE = '/admin/driver-metrics';

// ── Drivers List ──────────────────────────────────────────────────────────────
export const getDMDrivers = (params = {}) =>
  api.get(`${BASE}/drivers`, { params: { limit: 20, offset: 0, ...params } });

export const getDMDriversSummary = (params = {}) =>
  api.get(`${BASE}/drivers/summary`, { params });

// ── Live Map ──────────────────────────────────────────────────────────────────
export const getDMLiveMap = (params = {}) =>
  api.get(`${BASE}/live-map`, { params });

export const getDMLiveMapSummary = () =>
  api.get(`${BASE}/live-map/summary`);

// ── Driver Detail tabs ────────────────────────────────────────────────────────
export const getDMDriverOverview = (id) =>
  api.get(`${BASE}/drivers/${id}/overview`);

export const getDMDriverSessions = (id, params = {}) =>
  api.get(`${BASE}/drivers/${id}/sessions`, { params });

export const getDMDriverDaily = (id, params = {}) =>
  api.get(`${BASE}/drivers/${id}/daily`, { params });

export const getDMDriverStats = (id, params = {}) =>
  api.get(`${BASE}/drivers/${id}/stats`, { params });

export const getDMDriverTimeline = (id, params = {}) =>
  api.get(`${BASE}/drivers/${id}/timeline`, { params });

export const getDMDriverLocationHistory = (id, params = {}) =>
  api.get(`${BASE}/drivers/${id}/location-history`, { params });

export const getDMDriverBreaks = (id, params = {}) =>
  api.get(`${BASE}/drivers/${id}/breaks`, { params });

// ── Fleet Analytics ───────────────────────────────────────────────────────────
export const getDMLeaderboard = (params = {}) =>
  api.get(`${BASE}/leaderboard`, { params });

export const getDMFleetSummary = (params = {}) =>
  api.get(`${BASE}/fleet-summary`, { params });

export const getDMBreakCompliance = (params = {}) =>
  api.get(`${BASE}/break-compliance`, { params });

// ── Actions ───────────────────────────────────────────────────────────────────
export const forceOffline = (id) =>
  api.post(`${BASE}/drivers/${id}/force-offline`);
