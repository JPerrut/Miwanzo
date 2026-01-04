const db = require('../config/database');

const WorkArea = {
  create: async (workAreaData) => {
    const { id, name, userId } = workAreaData;
    const query = `
      INSERT INTO work_areas (id, name, user_id) 
      VALUES ($1, $2, $3) 
      RETURNING *
    `;
    const result = await db.query(query, [id, name, userId]);
    return result.rows[0];
  },

  findByUserId: async (userId) => {
    const query = 'SELECT * FROM work_areas WHERE user_id = $1 ORDER BY created_at DESC';
    const result = await db.query(query, [userId]);
    return result.rows;
  },

  findById: async (id) => {
    const query = 'SELECT * FROM work_areas WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0];
  },

  update: async (id, workAreaData) => {
    const { name } = workAreaData;
    const query = 'UPDATE work_areas SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2';
    const result = await db.query(query, [name, id]);
    return result.rowCount > 0;
  },

  delete: async (id) => {
    const query = 'DELETE FROM work_areas WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rowCount > 0;
  }
};

module.exports = WorkArea;