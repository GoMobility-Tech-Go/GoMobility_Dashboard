const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

function getToken() {
  return localStorage.getItem('access_token') || localStorage.getItem('goMobilityAccessToken') || '';
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `API error: ${res.status}`);
  }
  return res.json();
}

export const api = {
  // ── Auth ────────────────────────────────────────────────────────
  signin: (data) =>
    fetch(`${BASE_URL}/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(async res => {
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || err.error || `OTP send failed (${res.status})`);
      }
      return res.json();
    }),

  verifySignin: (data) =>
    fetch(`${BASE_URL}/auth/verify-signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(async res => {
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || err.error || `OTP verification failed (${res.status})`);
      }
      return res.json();
    }),

  // fetch current user using access token
  getProfile: () => request('/auth/me'),

  logout: () => request('/auth/logout', { method: 'POST' }),

  // ── Admin ──────────────────────────────────────────────────────
  getDashboard: () => request('/admin/dashboard'),
  getUsers: (params = {}) => request(`/admin/users?${new URLSearchParams(params)}`),
  updateUserStatus: (userId, status) =>
    request(`/admin/users/${userId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  getDrivers: (params = {}) => request(`/admin/drivers?${new URLSearchParams(params)}`),
  verifyDriver: (driverId) =>
    request(`/admin/drivers/${driverId}/verify`, { method: 'PATCH' }),
  updateDriverStatus: (driverId, status) =>
    request(`/admin/drivers/${driverId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  getRides: (params = {}) => request(`/admin/rides?${new URLSearchParams(params)}`),
  getTransactions: (params = {}) => request(`/admin/transactions?${new URLSearchParams(params)}`),
  getRevenueAnalytics: () => request('/admin/analytics/revenue'),

  // ── KYC ───────────────────────────────────────────────────────
  getKycQueue: () => request('/kyc/admin/queue'),
  getKycDrivers: (params = {}) => request(`/kyc/admin/drivers?${new URLSearchParams(params)}`),
  approveDocument: (docId) =>
    request(`/kyc/admin/documents/${docId}/approve`, { method: 'POST', body: JSON.stringify({}) }),
  rejectDocument: (docId, reason) =>
    request(`/kyc/admin/documents/${docId}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
  getFraudAlerts: () => request('/kyc/admin/fraud-alerts'),
  suspendDriver: (userId) =>
    request(`/kyc/admin/drivers/${userId}/suspend`, { method: 'POST', body: JSON.stringify({}) }),

  // ── Reviews ───────────────────────────────────────────────────
  getFlaggedReviews: () => request('/reviews/admin/flagged'),
  hideReview: (reviewId) => request(`/reviews/admin/${reviewId}/hide`, { method: 'PATCH' }),
  unflagReview: (reviewId) => request(`/reviews/admin/${reviewId}/unflag`, { method: 'PATCH' }),

  // ── Support ───────────────────────────────────────────────────
  getTickets: () => request('/support/tickets'),
  replyToTicket: (id, message) =>
    request(`/support/tickets/${id}/reply`, { method: 'POST', body: JSON.stringify({ message }) }),

  // ── SOS ───────────────────────────────────────────────────────
  getSosHistory: () => request('/sos/history'),
  cancelSos: (alertId) => request(`/sos/${alertId}/cancel`, { method: 'PATCH' }),

  // ── Subscriptions ─────────────────────────────────────────────
  getSubscriptionPlans: () => request('/subscriptions/plans'),
  createSubscriptionPlan: (data) =>
    request('/subscriptions/admin/plans', { method: 'POST', body: JSON.stringify(data) }),
  togglePlanStatus: (planId) =>
    request(`/subscriptions/admin/plans/${planId}/status`, { method: 'PATCH' }),

  // ── Pricing ───────────────────────────────────────────────────
  getPricingVehicles: () => request('/admin/pricing/vehicles'),
  getPricingSettings: () => request('/admin/pricing/settings'),
  getPricingGst: () => request('/admin/pricing/gst'),
  updateVehiclePricing: (vehicleType, data) =>
    request(`/admin/pricing/vehicles/${vehicleType}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // ── Payments ──────────────────────────────────────────────────
  initiateRefund: (data) =>
    request('/payments/refund', { method: 'POST', body: JSON.stringify(data) }),
};
