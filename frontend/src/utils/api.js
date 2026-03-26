import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://golfpools.onrender.com/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Request interceptor — attach auth token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (
      error.response?.status === 401 &&
      error.response?.data?.code === 'TOKEN_EXPIRED' &&
      !original._retry
    ) {
      original._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        if (typeof window !== 'undefined') window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  google: (data) => api.post('/auth/google', data),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  verifyPasswordOtp: (data) => api.post('/auth/verify-password-otp', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
};

// Users
export const usersAPI = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data) => api.put('/users/profile', data),
  changePassword: (data) => api.put('/users/change-password', data),
  updateAvatar: (formData) => api.post('/users/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  updateKyc: (formData) => api.post('/users/kyc', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
};

// Scores
export const scoresAPI = {
  getScores: () => api.get('/scores'),
  getStats: () => api.get('/scores/stats'),
  addScore: (data) => api.post('/scores', data),
  updateScore: (id, data) => api.put(`/scores/${id}`, data),
  deleteScore: (id) => api.delete(`/scores/${id}`),
};

// Subscriptions
export const subscriptionsAPI = {
  getCurrent: () => api.get('/subscriptions/current'),
  updateCharity: (data) => api.patch('/subscriptions/charity', data),
};

// Payments
export const paymentsAPI = {
  createOrder: (data) => api.post('/payments/create-order', data),
  verifyPayment: (data) => api.post('/payments/verify', data),
  createHosted: (data) => api.post('/payments/create-hosted', data),
  confirmHosted: (data) => api.post('/payments/confirm-hosted', data),
  getHistory: () => api.get('/payments/history'),
  cancelSubscription: () => api.post('/payments/cancel-subscription'),
};

// Draws
export const drawsAPI = {
  getAll: (params) => api.get('/draws', { params }),
  getCurrent: () => api.get('/draws/current'),
  getById: (id) => api.get(`/draws/${id}`),
  enterDraw: (id) => api.post(`/draws/${id}/enter`),
  getUserHistory: () => api.get('/draws/user/history'),
  // Admin
  createDraw: (data) => api.post('/draws', data),
  executeDraw: (id) => api.post(`/draws/${id}/execute`),
  simulateDraw: (id) => api.post(`/draws/${id}/simulate`),
};

// Charities
export const charitiesAPI = {
  getAll: (params) => api.get('/charities', { params }),
  getById: (id) => api.get(`/charities/${id}`),
  create: (data) => api.post('/charities', data),
  update: (id, data) => api.put(`/charities/${id}`, data),
  delete: (id) => api.delete(`/charities/${id}`),
};

// Winners
export const winnersAPI = {
  getMy: () => api.get('/winners/my'),
  uploadProof: (id, formData) => api.post(`/winners/${id}/upload-proof`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  // Admin
  getAll: (params) => api.get('/winners', { params }),
  approve: (id, data) => api.patch(`/winners/${id}/approve`, data),
  reject: (id, data) => api.patch(`/winners/${id}/reject`, data),
  markPaid: (id, data) => api.patch(`/winners/${id}/mark-paid`, data),
};

// Notifications
export const notificationsAPI = {
  getAll: () => api.get('/notifications'),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
};

// Admin
export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  getUsers: (params) => api.get('/admin/users', { params }),
  updateUser: (id, data) => api.patch(`/admin/users/${id}`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  getAnalytics: (params) => api.get('/admin/analytics', { params }),
  getSubscriptions: () => api.get('/admin/subscriptions'),
};

export default api;
