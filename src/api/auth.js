import api from './axios';

export const sendOtp = (phone) =>
  api.post('/auth/signin', { phone, role: 'admin' });

export const verifyOtp = (phone, otp) =>
  api.post('/auth/verify-signin', { phone, otp, role: 'admin' });

export const getProfile = () => api.get('/auth/me');

export const logoutApi = () => api.post('/auth/logout').catch(() => {});

export const registerAdmin = (data) =>
  api.post('/auth/register', data);
