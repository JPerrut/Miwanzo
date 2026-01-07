const db = require('../config/database');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

const User = {
  async create(userData) {
    const { email, username, password, avatar, google_id, name } = userData;
    
    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;
    const userId = uuidv4();
    const now = new Date().toISOString();
    
    // ATENÇÃO: Use os nomes EXATOS das colunas do seu banco
    // Verifique se as colunas são snake_case ou camelCase
    const query = `
      INSERT INTO users (
        id, email, username, name, password_hash, avatar, google_id, 
        created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, email, username, name, avatar, created_at
    `;
    
    // Removi email_verified da query já que parece não existir
    const values = [
      userId,           // 1. id
      email,           // 2. email
      username,        // 3. username
      name || null,    // 4. name
      hashedPassword,  // 5. password_hash
      avatar,          // 6. avatar
      google_id,       // 7. google_id
      now,             // 8. created_at
      now              // 9. updated_at
    ];
    
    const result = await db.query(query, values);
    return result.rows[0];
  },

  async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await db.query(query, [email]);
    return result.rows[0];
  },

  async findByUsername(username) {
    const query = 'SELECT * FROM users WHERE username = $1';
    const result = await db.query(query, [username]);
    return result.rows[0];
  },

  async findByGoogleId(googleId) {
    const query = 'SELECT * FROM users WHERE google_id = $1';
    const result = await db.query(query, [googleId]);
    return result.rows[0];
  },

  async findById(id) {
    const query = `
      SELECT id, email, username, name, avatar, 
             google_id, created_at, updated_at 
      FROM users WHERE id = $1
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  },

  async createSession(userId, token, expiresAt) {
    const sessionId = uuidv4();
    const now = new Date().toISOString();
    
    const query = `
      INSERT INTO user_sessions (id, user_id, token, expires_at, created_at)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const result = await db.query(query, [sessionId, userId, token, expiresAt, now]);
    return result.rows[0];
  },

  async findSessionByToken(token) {
    const query = `
      SELECT us.*, u.email, u.username, u.name, u.avatar
      FROM user_sessions us
      JOIN users u ON us.user_id = u.id
      WHERE us.token = $1 AND us.expires_at > NOW()
    `;
    const result = await db.query(query, [token]);
    return result.rows[0];
  },

  async deleteSession(token) {
    const query = 'DELETE FROM user_sessions WHERE token = $1';
    await db.query(query, [token]);
  },

  async updatePassword(id, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const query = 'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2';
    await db.query(query, [hashedPassword, id]);
  },

  async updateAvatar(id, avatarUrl) {
    const query = 'UPDATE users SET avatar = $1, updated_at = NOW() WHERE id = $2 RETURNING avatar';
    const result = await db.query(query, [avatarUrl, id]);
    return result.rows[0];
  },

  async updateProfile(id, updates) {
    const fields = ['updated_at = NOW()'];
    const values = [];
    let index = 1;

    if (updates.name !== undefined) {
      fields.push(`name = $${index++}`);
      values.push(updates.name);
    }
    if (updates.username !== undefined) {
      fields.push(`username = $${index++}`);
      values.push(updates.username);
    }
    if (updates.email !== undefined) {
      fields.push(`email = $${index++}`);
      values.push(updates.email);
    }
    if (updates.avatar !== undefined) {
      fields.push(`avatar = $${index++}`);
      values.push(updates.avatar);
    }

    if (fields.length === 1) {
      return null;
    }

    values.push(id);
    const query = `UPDATE users SET ${fields.join(', ')} WHERE id = $${index} 
                   RETURNING id, email, username, name, avatar`;
    const result = await db.query(query, values);
    return result.rows[0];
  },

  async findAll() {
    const query = `
      SELECT id, email, username, name, avatar, created_at, updated_at 
      FROM users ORDER BY created_at DESC
    `;
    const result = await db.query(query);
    return result.rows;
  },

  async deleteUser(id) {
    const query = 'DELETE FROM users WHERE id = $1';
    await db.query(query, [id]);
  },

  async exists(email, username) {
    const query = `
      SELECT EXISTS(
        SELECT 1 FROM users 
        WHERE email = $1 OR username = $2
      ) as exists
    `;
    const result = await db.query(query, [email, username]);
    return result.rows[0].exists;
  }
};

module.exports = User;