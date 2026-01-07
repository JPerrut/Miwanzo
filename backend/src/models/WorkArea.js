const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const WorkArea = {
  async create(workAreaData) {
    const { name, description, color, order_index, is_default, user_id } = workAreaData;
    const id = uuidv4();
    const now = new Date().toISOString();
    
    const query = `
      INSERT INTO work_areas (
        id, name, description, color, order_index, is_default, 
        user_id, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    
    const values = [
      id,
      name,
      description || null,
      color || '#3b82f6',
      order_index || 0,
      is_default || false,
      user_id,
      now,
      now
    ];
    
    const result = await db.query(query, values);
    return result.rows[0];
  },

  async findByUserId(user_id) {
    const query = `
      SELECT * FROM work_areas 
      WHERE user_id = $1 
      ORDER BY order_index ASC, created_at ASC
    `;
    const result = await db.query(query, [user_id]);
    return result.rows;
  },

  async findById(id, user_id = null) {
    let query = 'SELECT * FROM work_areas WHERE id = $1';
    const values = [id];
    
    if (user_id) {
      query += ' AND user_id = $2';
      values.push(user_id);
    }
    
    const result = await db.query(query, values);
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
    if (updates.color !== undefined) {
      fields.push(`color = $${index++}`);
      values.push(updates.color);
    }
    if (updates.order_index !== undefined) {
      fields.push(`order_index = $${index++}`);
      values.push(updates.order_index);
    }
    if (updates.is_default !== undefined) {
      fields.push(`is_default = $${index++}`);
      values.push(updates.is_default);
    }

    values.push(id);
    let query = `UPDATE work_areas SET ${fields.join(', ')} WHERE id = $${index}`;
    
    if (user_id) {
      query += ` AND user_id = $${index + 1}`;
      values.push(user_id);
    }
    
    query += ' RETURNING *';
    const result = await db.query(query, values);
    return result.rows[0];
  },

  async delete(id, user_id = null) {
    let query = 'DELETE FROM work_areas WHERE id = $1';
    const values = [id];
    
    if (user_id) {
      query += ' AND user_id = $2';
      values.push(user_id);
    }
    
    await db.query(query, values);
  },

  async setAsDefault(id, user_id) {
    await db.query(
      'UPDATE work_areas SET is_default = false WHERE user_id = $1',
      [user_id]
    );
    
    const result = await db.query(
      'UPDATE work_areas SET is_default = true WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, user_id]
    );
    
    return result.rows[0];
  },

  async reorder(user_id, orderMap) {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');
      
      for (const [id, order_index] of Object.entries(orderMap)) {
        await client.query(
          'UPDATE work_areas SET order_index = $1 WHERE id = $2 AND user_id = $3',
          [order_index, id, user_id]
        );
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

  async countByUserId(user_id) {
    const query = 'SELECT COUNT(*) as count FROM work_areas WHERE user_id = $1';
    const result = await db.query(query, [user_id]);
    return parseInt(result.rows[0].count);
  },

  async findDefaultByUserId(user_id) {
    const query = 'SELECT * FROM work_areas WHERE user_id = $1 AND is_default = true LIMIT 1';
    const result = await db.query(query, [user_id]);
    return result.rows[0];
  },

  async findWithSections(user_id) {
    const query = `
      SELECT 
        wa.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', s.id,
              'name', s.name,
              'description', s.description,
              'order_index', s.order_index,
              'created_at', s.created_at
            ) ORDER BY s.order_index ASC
          ) FILTER (WHERE s.id IS NOT NULL), 
          '[]'
        ) as sections
      FROM work_areas wa
      LEFT JOIN sections s ON wa.id = s.work_area_id
      WHERE wa.user_id = $1
      GROUP BY wa.id
      ORDER BY wa.order_index ASC
    `;
    const result = await db.query(query, [user_id]);
    return result.rows;
  }
};

module.exports = WorkArea;