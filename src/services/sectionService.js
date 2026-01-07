import api from './api';

export const sectionService = {
  async getSectionsByWorkArea(workAreaId) {
    try {
      const response = await api.get(`/sections?work_area_id=${workAreaId}`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching sections:', error);
      throw error;
    }
  },

  async createSection(data) {
    try {
      const response = await api.post('/sections', data);
      return response.data.data;
    } catch (error) {
      console.error('Error creating section:', error);
      throw error;
    }
  },

  async deleteSection(id) {
    try {
      const response = await api.delete(`/sections/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting section:', error);
      throw error;
    }
  }
};