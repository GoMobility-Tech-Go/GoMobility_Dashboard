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
export const issueRefund = (data) => api.post('/wallet/refund', data);

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
export const getFraudAlerts = (params = {}) =>
  api.get('/kyc/admin/fraud-alerts', { params });
export const suspendDriver = (userId, reason) =>
  api.post(`/kyc/admin/drivers/${userId}/suspend`, { reason });

// ── Notifications ─────────────────────────────────────────────────────────────
export const triggerEngagement = (data) =>
  api.post('/notifications/trigger-engagement', data);
export const getNotificationSchedule = () => api.get('/notifications/schedule');

// ── Support / Complaints ───────────────────────────────────────────────────────
export const getSupportTickets = (params = {}) =>
  api.get('/support/tickets', { params });
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
