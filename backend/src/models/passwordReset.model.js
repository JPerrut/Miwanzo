const db = require('../config/database');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

const MAX_RESET_ATTEMPTS = 5;

const PasswordReset = {
  async ensureTable() {
    await db.query(`
      CREATE TABLE IF NOT EXISTS password_reset_codes (
        id UUID PRIMARY KEY,
        user_id TEXT NOT NULL,
        email VARCHAR(255) NOT NULL,
        code_hash VARCHAR(255) NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        expires_at TIMESTAMP NOT NULL,
        consumed_at TIMESTAMP NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_password_reset_codes_user_id
      ON password_reset_codes(user_id)
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_password_reset_codes_email
      ON password_reset_codes(email)
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_password_reset_codes_active
      ON password_reset_codes(user_id, consumed_at, expires_at)
    `);
  },

  async invalidateActiveByUserId(userId) {
    await db.query(
      `
        UPDATE password_reset_codes
        SET consumed_at = NOW()
        WHERE user_id = $1
          AND consumed_at IS NULL
      `,
      [userId],
    );
  },

  async createResetCode({ userId, email, code, expiresAt }) {
    const id = uuidv4();
    const codeHash = await bcrypt.hash(code, 10);

    const result = await db.query(
      `
        INSERT INTO password_reset_codes (
          id, user_id, email, code_hash, expires_at
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `,
      [id, userId, email, codeHash, expiresAt],
    );

    return result.rows[0];
  },

  async findLatestActiveByUserId(userId) {
    const result = await db.query(
      `
        SELECT *
        FROM password_reset_codes
        WHERE user_id = $1
          AND consumed_at IS NULL
          AND expires_at > NOW()
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [userId],
    );

    return result.rows[0];
  },

  async compareCode(resetEntry, code) {
    if (!resetEntry?.code_hash) return false;
    return bcrypt.compare(String(code || ''), resetEntry.code_hash);
  },

  async incrementAttempts(id) {
    const result = await db.query(
      `
        UPDATE password_reset_codes
        SET attempts = attempts + 1
        WHERE id = $1
        RETURNING *
      `,
      [id],
    );

    return result.rows[0];
  },

  async markConsumed(id) {
    await db.query(
      `
        UPDATE password_reset_codes
        SET consumed_at = NOW()
        WHERE id = $1
      `,
      [id],
    );
  },

  async deleteExpired() {
    await db.query(
      `
        DELETE FROM password_reset_codes
        WHERE consumed_at IS NOT NULL
           OR expires_at <= NOW()
           OR attempts >= $1
      `,
      [MAX_RESET_ATTEMPTS],
    );
  },

  MAX_RESET_ATTEMPTS,
};

module.exports = PasswordReset;
