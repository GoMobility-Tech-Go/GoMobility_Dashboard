import api from './axios';

export const sendOtp = (phone, role = 'admin') =>
  api.post('/auth/signin', { phone, role });

export const verifyOtp = (phone, otp, role = 'admin') =>
  api.post('/auth/verify-signin', { phone, otp, role });

export const getProfile = () => api.get('/auth/me');

export const logoutApi = () => api.post('/auth/logout').catch(() => {});

export const signupSendOtp = (phone) =>
  api.post('/auth/signup', { phone, role: 'admin' });

export const signupVerifyOtp = (phone, otp, fullName) =>
  api.post('/auth/verify-signup', { phone, otp, role: 'admin', fullName });
