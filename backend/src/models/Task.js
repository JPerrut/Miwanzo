const db = require('../config/database');

const Task = {
  create: async (taskData) => {
    const { id, title, description, sectionId, userId } = taskData;
    const query = `
      INSERT INTO tasks (id, title, description, section_id, user_id) 
      VALUES ($1, $2, $3, $4, $5) 
      RETURNING *
    `;
    const result = await db.query(query, [id, title, description, sectionId, userId]);
    return result.rows[0];
  },

  findBySectionId: async (sectionId) => {
    const query = 'SELECT * FROM tasks WHERE section_id = $1 ORDER BY created_at ASC';
    const result = await db.query(query, [sectionId]);
    return result.rows;
  },

  findById: async (id) => {
    const query = 'SELECT * FROM tasks WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0];
  },

  update: async (id, taskData) => {
    const { title, description, completed } = taskData;
    const query = `
      UPDATE tasks 
      SET title = $1, description = $2, completed = $3, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $4
    `;
    const result = await db.query(query, [title, description, completed, id]);
    return result.rowCount > 0;
  },

  delete: async (id) => {
    const query = 'DELETE FROM tasks WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rowCount > 0;
  },

  deleteBySectionId: async (sectionId) => {
    const query = 'DELETE FROM tasks WHERE section_id = $1';
    const result = await db.query(query, [sectionId]);
    return result.rowCount > 0;
  }
};

module.exports = Task;