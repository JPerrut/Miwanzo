const db = require('../config/database');

const Section = {
  create: async (sectionData) => {
    const { id, name, workAreaId, userId } = sectionData;
    const query = `
      INSERT INTO sections (id, name, work_area_id, user_id) 
      VALUES ($1, $2, $3, $4) 
      RETURNING *
    `;
    const result = await db.query(query, [id, name, workAreaId, userId]);
    return result.rows[0];
  },

  findByWorkAreaId: async (workAreaId) => {
    const query = 'SELECT * FROM sections WHERE work_area_id = $1 ORDER BY created_at ASC';
    const result = await db.query(query, [workAreaId]);
    return result.rows;
  },

  findById: async (id) => {
    const query = 'SELECT * FROM sections WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0];
  },

  delete: async (id) => {
    const query = 'DELETE FROM sections WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rowCount > 0;
  },

  deleteByWorkAreaId: async (workAreaId) => {
    const query = 'DELETE FROM sections WHERE work_area_id = $1';
    const result = await db.query(query, [workAreaId]);
    return result.rowCount > 0;
  }
};

module.exports = Section;