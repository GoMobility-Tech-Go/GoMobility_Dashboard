import api from './axios';

export const sendOtp = (phone) =>
  api.post('/auth/signin', { phone, role: 'admin' });

export const verifyOtp = (phone, otp) =>
  api.post('/auth/verify-signin', { phone, otp, role: 'admin' });

export const getProfile = () => api.get('/auth/me');

export const logoutApi = () => api.post('/auth/logout').catch(() => {});

// Step 1: send OTP to phone for signup
export const signupSendOtp = (phone) =>
  api.post('/auth/signup', { phone, role: 'admin' });

// Step 2: verify OTP and create account
export const signupVerifyOtp = (phone, otp, fullName) =>
  api.post('/auth/verify-signup', { phone, otp, role: 'admin', fullName });
