const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const Section = {
  async create(sectionData) {
    const { name, description, order_index, work_area_id, user_id } = sectionData;
    const id = uuidv4();
    const now = new Date().toISOString();
    
    const query = `
      INSERT INTO sections (
        id, name, description, order_index, work_area_id, user_id, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    
    const values = [
      id,
      name,
      description || null,
      order_index || 0,
      work_area_id,
      user_id,
      now,
      now
    ];
    
    const result = await db.query(query, values);
    return result.rows[0];
  },

  async findByWorkAreaId(work_area_id) {
    const query = `
      SELECT * FROM sections 
      WHERE work_area_id = $1 
      ORDER BY order_index ASC, created_at ASC
    `;
    const result = await db.query(query, [work_area_id]);
    return result.rows;
  },

  async findById(id) {
    const query = 'SELECT * FROM sections WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0];
  },

  async update(id, updates, user_id = null) {
    const fields = ['updated_at = NOW()'];
    const values = [];
    let index = 1;

    if (updates.name !== undefined) {
      fields.push(`name = $${index++}`);
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      fields.push(`description = $${index++}`);
      values.push(updates.description);
    }
    if (updates.order_index !== undefined) {
      fields.push(`order_index = $${index++}`);
      values.push(updates.order_index);
    }
    if (updates.work_area_id !== undefined) {
      fields.push(`work_area_id = $${index++}`);
      values.push(updates.work_area_id);
    }

    values.push(id);
    let query = `UPDATE sections SET ${fields.join(', ')} WHERE id = $${index}`;
    
    if (user_id) {
      query += ` AND user_id = $${index + 1}`;
      values.push(user_id);
    }
    
    query += ' RETURNING *';
    const result = await db.query(query, values);
    return result.rows[0];
  },

  async delete(id, user_id = null) {
    let query = 'DELETE FROM sections WHERE id = $1';
    const values = [id];
    
    if (user_id) {
      query += ' AND user_id = $2';
      values.push(user_id);
    }
    
    await db.query(query, values);
  },

  async reorder(work_area_id, orderMap, user_id = null) {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');
      
      for (const [id, order_index] of Object.entries(orderMap)) {
        let query = 'UPDATE sections SET order_index = $1 WHERE id = $2 AND work_area_id = $3';
        const values = [order_index, id, work_area_id];
        
        if (user_id) {
          query += ' AND user_id = $4';
          values.push(user_id);
        }
        
        await client.query(query, values);
      }
      
      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async countByWorkAreaId(work_area_id) {
    const query = 'SELECT COUNT(*) as count FROM sections WHERE work_area_id = $1';
    const result = await db.query(query, [work_area_id]);
    return parseInt(result.rows[0].count);
  }
};

module.exports = Section;