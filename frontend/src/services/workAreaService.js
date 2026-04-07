import api from './api';

export const workAreaService = {
  async getWorkAreas() {
    try {
      const response = await api.get('/work-areas');
      return response.data.data;
    } catch (error) {
      console.error('Error fetching work areas:', error);
      throw error;
    }
  },

  async getWorkArea(id) {
    try {
      const response = await api.get(`/work-areas/${id}`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching work area:', error);
      throw error;
    }
  },

  async createWorkArea(data) {
    try {
      const response = await api.post('/work-areas', data);
      return response.data.data;
    } catch (error) {
      console.error('Error creating work area:', error);
      throw error;
    }
  },

  async updateWorkArea(id, data) {
    try {
      const response = await api.put(`/work-areas/${id}`, data);
      return response.data.data;
    } catch (error) {
      console.error('Error updating work area:', error);
      throw error;
    }
  },

  async deleteWorkArea(id) {
    try {
      const response = await api.delete(`/work-areas/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting work area:', error);
      throw error;
    }
  }
};