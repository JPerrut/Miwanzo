const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const Task = {
  async create(taskData) {
    const { 
      title, 
      description, 
      status = 'PENDING', 
      priority = 'MEDIUM', 
      due_date = null,
      order_index = 0, 
      user_id, 
      section_id 
    } = taskData;
    
    const id = uuidv4();
    const now = new Date().toISOString();
    
    // Se a tarefa já nasce como COMPLETED, preenche completed_at
    const completed_at = status === 'COMPLETED' ? now : null;
    
    const query = `
      INSERT INTO tasks (
        id, title, description, status, priority, due_date, 
        completed_at, order_index, user_id, section_id, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;
    
    const values = [
      id,
      title,
      description || null,
      status,
      priority,
      due_date,
      completed_at,
      order_index,
      user_id,
      section_id,
      now,
      now
    ];
    
    console.log('Executing query:', query);
    console.log('With values:', values);
    
    const result = await db.query(query, values);
    return result.rows[0];
  },

  async findByUserId(user_id) {
    const query = `
      SELECT * FROM tasks 
      WHERE user_id = $1 
      ORDER BY order_index ASC, created_at ASC
    `;
    const result = await db.query(query, [user_id]);
    return result.rows;
  },

  async findBySectionId(section_id) {
    const query = `
      SELECT * FROM tasks 
      WHERE section_id = $1 
      ORDER BY order_index ASC, created_at ASC
    `;
    const result = await db.query(query, [section_id]);
    return result.rows;
  },

  async findById(id, user_id = null) {
    let query = 'SELECT * FROM tasks WHERE id = $1';
    const values = [id];
    
    if (user_id) {
      query += ' AND user_id = $2';
      values.push(user_id);
    }
    
    const result = await db.query(query, values);
    return result.rows[0];
  },

  async toggleComplete(id, user_id = null) {
    // Primeiro pega a tarefa atual
    const task = await this.findById(id, user_id);
    
    if (!task) return null;
    
    const newStatus = task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    const completed_at = newStatus === 'COMPLETED' ? new Date().toISOString() : null;
    
    const result = await db.query(
      `UPDATE tasks 
      SET status = $1, completed_at = $2, updated_at = NOW() 
      WHERE id = $3 ${user_id ? 'AND user_id = $4' : ''}
      RETURNING *`,
      user_id ? [newStatus, completed_at, id, user_id] : [newStatus, completed_at, id]
    );
    
    return result.rows[0];
  },

  async update(id, updates, user_id = null) {
    const fields = ['updated_at = NOW()'];
    const values = [];
    let index = 1;

    if (updates.title !== undefined) {
      fields.push(`title = $${index++}`);
      values.push(updates.title);
    }
    if (updates.description !== undefined) {
      fields.push(`description = $${index++}`);
      values.push(updates.description);
    }
    if (updates.status !== undefined) {
      fields.push(`status = $${index++}`);
      values.push(updates.status);
    }
    if (updates.priority !== undefined) {
      fields.push(`priority = $${index++}`);
      values.push(updates.priority);
    }
    if (updates.due_date !== undefined) {
      fields.push(`due_date = $${index++}`);
      values.push(updates.due_date);
    }
    if (updates.completed_at !== undefined) {
      fields.push(`completed_at = $${index++}`);
      values.push(updates.completed_at);
    }
    if (updates.order_index !== undefined) {
      fields.push(`order_index = $${index++}`);
      values.push(updates.order_index);
    }
    if (updates.section_id !== undefined) {
      fields.push(`section_id = $${index++}`);
      values.push(updates.section_id);
    }

    values.push(id);
    let query = `UPDATE tasks SET ${fields.join(', ')} WHERE id = $${index}`;
    
    if (user_id) {
      query += ` AND user_id = $${index + 1}`;
      values.push(user_id);
    }
    
    query += ' RETURNING *';
    const result = await db.query(query, values);
    return result.rows[0];
  },

  async delete(id, user_id = null) {
    let query = 'DELETE FROM tasks WHERE id = $1';
    const values = [id];
    
    if (user_id) {
      query += ' AND user_id = $2';
      values.push(user_id);
    }
    
    query += ' RETURNING id'; 
    const result = await db.query(query, values);
    
    return result.rowCount > 0;
  },

  async completeTask(id, user_id) {
    const result = await db.query(
      `UPDATE tasks 
       SET status = 'COMPLETED', completed_at = NOW(), updated_at = NOW() 
       WHERE id = $1 AND user_id = $2 
       RETURNING *`,
      [id, user_id]
    );
    return result.rows[0];
  },

  async reorder(section_id, orderMap, user_id = null) {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');
      
      for (const [id, order_index] of Object.entries(orderMap)) {
        let query = 'UPDATE tasks SET order_index = $1 WHERE id = $2 AND section_id = $3';
        const values = [order_index, id, section_id];
        
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

  async findByStatus(user_id, status) {
    const query = `
      SELECT * FROM tasks 
      WHERE user_id = $1 AND status = $2 
      ORDER BY due_date ASC, created_at ASC
    `;
    const result = await db.query(query, [user_id, status]);
    return result.rows;
  },

  async findByPriority(user_id, priority) {
    const query = `
      SELECT * FROM tasks 
      WHERE user_id = $1 AND priority = $2 
      ORDER BY due_date ASC, created_at ASC
    `;
    const result = await db.query(query, [user_id, priority]);
    return result.rows;
  },

  async findOverdue(user_id) {
    const query = `
      SELECT * FROM tasks 
      WHERE user_id = $1 
        AND due_date < NOW() 
        AND status != 'COMPLETED'
      ORDER BY due_date ASC
    `;
    const result = await db.query(query, [user_id]);
    return result.rows;
  },

  async findDueToday(user_id) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    
    const query = `
      SELECT * FROM tasks 
      WHERE user_id = $1 
        AND due_date >= $2 
        AND due_date < $3
        AND status != 'COMPLETED'
      ORDER BY due_date ASC
    `;
    const result = await db.query(query, [user_id, todayStart, tomorrowStart]);
    return result.rows;
  },

  async countByStatus(user_id) {
    const query = `
      SELECT status, COUNT(*) as count 
      FROM tasks 
      WHERE user_id = $1 
      GROUP BY status
    `;
    const result = await db.query(query, [user_id]);
    return result.rows;
  },

  async moveToSection(taskId, new_section_id, user_id) {
    const result = await db.query(
      `UPDATE tasks 
       SET section_id = $1, updated_at = NOW() 
       WHERE id = $2 AND user_id = $3 
       RETURNING *`,
      [new_section_id, taskId, user_id]
    );
    return result.rows[0];
  },

  async deleteBySectionId(section_id, user_id = null) {
    let query = 'DELETE FROM tasks WHERE section_id = $1';
    const values = [section_id];
    
    if (user_id) {
      query += ' AND user_id = $2';
      values.push(user_id);
    }
    
    await db.query(query, values);
  },

  async deleteByUserId(user_id) {
    const query = 'DELETE FROM tasks WHERE user_id = $1';
    await db.query(query, [user_id]);
  }
};

module.exports = Task;