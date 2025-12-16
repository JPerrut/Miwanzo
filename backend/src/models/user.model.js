const db = require('../config/database');
const bcrypt = require('bcrypt');

const User = {
  async create(userData) {
    const { email, username, password, full_name, avatar_url, google_id } = userData;
    
    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;
    
    const query = `
      INSERT INTO users (email, username, password_hash, full_name, avatar_url, google_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, email, username, full_name, avatar_url, created_at
    `;
    
    const values = [email, username, hashedPassword, full_name, avatar_url, google_id];
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
    const query = 'SELECT id, email, username, full_name, avatar_url, created_at FROM users WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0];
  },

  async createSession(userId, token, expiresAt) {
    const query = `
      INSERT INTO user_sessions (user_id, session_token, expires_at)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const result = await db.query(query, [userId, token, expiresAt]);
    return result.rows[0];
  },

  async findSessionByToken(token) {
    const query = `
      SELECT us.*, u.email, u.username, u.full_name, u.avatar_url
      FROM user_sessions us
      JOIN users u ON us.user_id = u.id
      WHERE us.session_token = $1 AND us.expires_at > NOW()
    `;
    const result = await db.query(query, [token]);
    return result.rows[0];
  },

  async deleteSession(token) {
    const query = 'DELETE FROM user_sessions WHERE session_token = $1';
    await db.query(query, [token]);
  },
};

module.exports = User;