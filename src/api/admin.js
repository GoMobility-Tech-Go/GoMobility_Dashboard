import api from './axios';

// ── Dashboard ────────────────────────────────────────────────────────────────
export const getDashboard = () => api.get('/admin/dashboard');
export const getRevenueAnalytics = (days = 7) =>
  api.get(`/admin/analytics/revenue?days=${days}`);

// ── Users ────────────────────────────────────────────────────────────────────
export const getUsers = (params = {}) =>
  api.get('/admin/users', { params: { limit: 20, offset: 0, ...params } });
export const getUserById = (userId) => api.get(`/admin/users/${userId}`);
export const updateUserStatus = (userId, is_active) =>
  api.patch(`/admin/users/${userId}/status`, { is_active });

// ── Drivers ──────────────────────────────────────────────────────────────────
export const getDrivers = (params = {}) =>
  api.get('/admin/drivers', { params: { limit: 20, offset: 0, ...params } });
export const getDriverById = (driverId) => api.get(`/admin/drivers/${driverId}`);
export const verifyDriver = (driverId, is_verified) =>
  api.patch(`/admin/drivers/${driverId}/verify`, { is_verified });
export const updateDriverStatus = (driverId, is_active) =>
  api.patch(`/admin/drivers/${driverId}/status`, { is_active });

// ── Rides ────────────────────────────────────────────────────────────────────
export const getRides = (params = {}) =>
  api.get('/admin/rides', { params: { limit: 20, offset: 0, ...params } });

// ── Transactions ──────────────────────────────────────────────────────────────
export const getTransactions = (params = {}) =>
  api.get('/admin/transactions', { params: { limit: 20, offset: 0, ...params } });

// ── Refunds ───────────────────────────────────────────────────────────────────
// Unified endpoint (2026-07-12) — replaces old /wallet/refund, /wallet/referral-bonus, /payments/refund.
// See docs/18_REFUNDS_API_MIGRATION.md for the full contract.
export const createRefund = (data) => api.post('/admin/refunds', data);

// ── Pricing ───────────────────────────────────────────────────────────────────
export const getPricingVehicles = () => api.get('/admin/pricing/vehicles');
export const updateVehiclePricing = (vehicleType, data) =>
  api.patch(`/admin/pricing/vehicles/${vehicleType}`, data);
export const getPricingSettings = () => api.get('/admin/pricing/settings');
export const updatePricingSetting = (key, value, value_type = 'float') =>
  api.patch(`/admin/pricing/settings/${key}`, { value, value_type });
export const reloadPricingCache = () => api.post('/admin/pricing/cache/reload');
export const getPricingGst = () => api.get('/admin/pricing/gst');
export const updatePricingGst = (data) => api.patch('/admin/pricing/gst', data);

// ── Pricing Subscribers (Driver Tiers) ────────────────────────────────────────
export const getPricingSubscribers = () => api.get('/admin/pricing/subscribers');
export const updatePricingSubscriber = (tierName, data) =>
  api.patch(`/admin/pricing/subscribers/${tierName}`, data);

// ── Subscriptions ─────────────────────────────────────────────────────────────
export const getSubscriptionPlans = () => api.get('/subscriptions/plans');
export const createSubscriptionPlan = (data) =>
  api.post('/subscriptions/admin/plans', data);
export const togglePlanStatus = (planId, is_active) =>
  api.patch(`/subscriptions/admin/plans/${planId}/status`, { is_active });

// ── Reviews ───────────────────────────────────────────────────────────────────
export const getFlaggedReviews = (params = {}) =>
  api.get('/reviews/admin/flagged', { params: { limit: 20, offset: 0, ...params } });
export const hideReview = (reviewId) =>
  api.patch(`/reviews/admin/${reviewId}/hide`);
export const unflagReview = (reviewId) =>
  api.patch(`/reviews/admin/${reviewId}/unflag`);

// ── KYC ───────────────────────────────────────────────────────────────────────
export const getKycQueue = (params = {}) =>
  api.get('/kyc/admin/queue', { params: { limit: 20, page: 1, ...params } });
export const approveDocument = (docId) =>
  api.post(`/kyc/admin/documents/${docId}/approve`, {});
export const rejectDocument = (docId, reason, allowRetry = true) =>
  api.post(`/kyc/admin/documents/${docId}/reject`, { reason, allowRetry });
export const editKycDocument = (docId, formData) =>
  api.patch(`/kyc/admin/documents/${docId}/edit`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const getFraudAlerts = (params = {}) =>
  api.get('/kyc/admin/fraud-alerts', { params });
export const suspendDriver = (userId, reason) =>
  api.post(`/kyc/admin/drivers/${userId}/suspend`, { reason });

// ── Notifications ─────────────────────────────────────────────────────────────
export const triggerEngagement = (data) =>
  api.post('/notifications/admin/trigger-engagement', data);
export const getNotificationSchedule = () => api.get('/notifications/admin/schedule');

// ── Support / Complaints ───────────────────────────────────────────────────────
export const getSupportTickets = (params = {}) =>
  api.get('/support/search', { params: { limit: 50, ...params } });
export const replyToTicket = (ticketId, message) =>
  api.post(`/support/tickets/${ticketId}/reply`, { message });

// ── SOS / Emergency ───────────────────────────────────────────────────────────
export const getSosHistory = (params = {}) =>
  api.get('/sos/history', { params });
export const cancelSos = (alertId) =>
  api.patch(`/sos/${alertId}/cancel`);

// ── KYC Document Detail ───────────────────────────────────────────────────────
export const getKycDocument = (docId) =>
  api.get(`/kyc/admin/documents/${docId}`);
export const getDriverKycStatus = (userId) =>
  api.get(`/kyc/admin/drivers/${userId}`);

// ── Payouts (withdrawal transactions) ─────────────────────────────────────────
export const getPayouts = (params = {}) =>
  api.get('/admin/transactions', { params: { category: 'withdrawal', limit: 20, offset: 0, ...params } });

// ── Subscription Plan Update ──────────────────────────────────────────────────
export const updateSubscriptionPlan = (planId, data) =>
  api.patch(`/subscriptions/admin/plans/${planId}`, data);

// ── Pricing Distance Tiers ────────────────────────────────────────────────────
export const getPricingTiers = () => api.get('/admin/pricing/tiers');
export const updatePricingTier = (tierName, data) =>
  api.put(`/admin/pricing/tiers/${tierName}`, data);

// ── Pricing Penalties ─────────────────────────────────────────────────────────
export const getPricingPenalties = () => api.get('/admin/pricing/penalties');
export const upsertPricingPenalty = (offenseType, offenseCount, data) =>
  api.put(`/admin/pricing/penalties/${offenseType}/${offenseCount}`, data);
export const deletePricingPenalty = (offenseType, offenseCount) =>
  api.delete(`/admin/pricing/penalties/${offenseType}/${offenseCount}`);

// ── Reports ───────────────────────────────────────────────────────────────────
export const runReport = (reportType) =>
  api.post(`/admin/reports/run/${reportType}`);

// ── Infra Stats (Redis + Queues) ──────────────────────────────────────────────
export const getRedisStats = () => api.get('/admin/infra/redis/stats');
export const getQueueStats = () => api.get('/admin/infra/queues');

// ── Admin Notifications ───────────────────────────────────────────────────────
export const getAdminNotifications = (params = {}) =>
  api.get('/notifications', { params: { limit: 20, offset: 0, ...params } });
export const getUnreadNotifCount = () => api.get('/notifications/unread-count');
export const markNotifRead = (id) => api.patch(`/notifications/${id}/read`);
export const markAllNotifRead = () => api.patch('/notifications/read-all');

// ── Support Categories ────────────────────────────────────────────────────────
export const getSupportCategories = () => api.get('/support/categories');

// ── Passengers ────────────────────────────────────────────────────────────────
export const getPassengerStats = (from, to) => {
  const params = {};
  if (from) params.from = from;
  if (to)   params.to   = to;
  return api.get('/admin/passengers/stats', { params });
};

// ── API Logs (dev tool — restricted by phone) ─────────────────────────────────
export const getApiLogs = (params = {}) =>
  api.get('/admin/logs', { params: { limit: 200, offset: 0, ...params } });

// ── Cities ────────────────────────────────────────────────────────────────────
export const getCities              = ()                              => api.get('/admin/cities');
export const getCityDetail          = (id)                            => api.get(`/admin/cities/${id}`);
export const getCityStats           = (id)                            => api.get(`/admin/cities/${id}/stats`);
export const createCity             = (data)                          => api.post('/admin/cities', data);
export const updateCity             = (id, data)                      => api.patch(`/admin/cities/${id}`, data);
export const toggleCityVehicle      = (id, vehicle_type, is_enabled)  => api.patch(`/admin/cities/${id}/vehicles`, { vehicle_type, is_enabled });
export const setCityEnforcement     = (enabled)                       => api.patch('/admin/cities/enforcement', { enabled });
export const resolveCity            = (lat, lng)                      => api.get(`/admin/cities/resolve?lat=${lat}&lng=${lng}`);
