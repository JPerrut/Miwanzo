import api from './api';

export const taskService = {
  async getTasksBySection(sectionId) {
    try {
      const response = await api.get(`/tasks?section_id=${sectionId}`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching tasks:', error);
      throw error;
    }
  },

  async createTask(data) {
    try {
      console.log('Creating task with data:', data);
      const response = await api.post('/tasks', data);
      console.log('Task created successfully:', response.data);
      return response.data.data;
    } catch (error) {
      console.error('Error creating task:', error);
      console.error('Error response:', error.response?.data);
      throw error;
    }
  },

  async updateTask(id, data) {
    try {
      const response = await api.put(`/tasks/${id}`, data);
      return response.data.data;
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  },

  async deleteTask(id) {
    try {
      const response = await api.delete(`/tasks/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  }
};