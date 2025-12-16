import api from './api';

export const authService = {
  async register(userData) {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  async login(credentials) {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  async logout() {
    const response = await api.post('/auth/logout');
    return response.data;
  },

  async getProfile() {
    const response = await api.get('/auth/profile');
    return response.data;
  },

  async verifyToken() {
    try {
      const response = await api.get('/auth/verify');
      return response.data;
    } catch (error) {
      return { valid: false };
    }
  },

  // Salvar dados no localStorage
  saveAuthData(token, user) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  },

  // Remover dados do localStorage
  clearAuthData() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  // Obter dados do localStorage
  getAuthData() {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    
    return { token, user };
  },

  // Verificar se está autenticado
  isAuthenticated() {
    return !!localStorage.getItem('token');
  },
};