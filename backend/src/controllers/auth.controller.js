const crypto = require('crypto');
const User = require('../models/user.model');
const PasswordReset = require('../models/passwordReset.model');
const { generateToken, verifyPassword, calculateExpiry } = require('../utils/auth.utils');
const passport = require('../config/passport');
const {
  canUseDevelopmentEmailFallback,
  getResetCodeMinutes,
  isEmailNotConfiguredError,
  sendPasswordResetCode,
} = require('../services/email.service');

function handleAuthError(res, error, context) {
  console.error(`Erro em ${context}:`, error);

  if (error.code === '28P01') {
    return res.status(503).json({
      error: 'Falha de autenticacao no banco de dados. Verifique a DATABASE_URL em backend/.env.',
    });
  }

  if (error.code === '3D000') {
    return res.status(503).json({
      error: 'Banco de dados configurado nao existe. Verifique o nome do banco em backend/.env.',
    });
  }

  if (error.code === 'ECONNREFUSED') {
    return res.status(503).json({
      error: 'Nao foi possivel conectar ao PostgreSQL. Verifique se o servico esta ativo.',
    });
  }

  if (error.code === 'EMAIL_NOT_CONFIGURED') {
    return res.status(503).json({
      error: error.message,
    });
  }

  return res.status(500).json({ error: 'Erro interno do servidor' });
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function generateResetCode() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
}

const authController = {
  async register(req, res) {
    try {
      const email = normalizeEmail(req.body?.email);
      const username = req.body?.username;
      const password = req.body?.password;
      const confirmPassword = req.body?.confirmPassword;

      if (password !== confirmPassword) {
        return res.status(400).json({ error: 'As senhas nao coincidem' });
      }

      const existingEmail = await User.findByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ error: 'Email ja cadastrado' });
      }

      const existingUsername = await User.findByUsername(username);
      if (existingUsername) {
        return res.status(400).json({ error: 'Nome de usuario ja em uso' });
      }

      const user = await User.create({
        email,
        username,
        password,
      });

      const token = generateToken(user.id);
      const expiresAt = calculateExpiry();

      await User.createSession(user.id, token, expiresAt);

      res.status(201).json({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          avatar_url: user.avatar_url,
        },
      });
    } catch (error) {
      return handleAuthError(res, error, 'register');
    }
  },

  async login(req, res) {
    try {
      const email = normalizeEmail(req.body?.email);
      const password = req.body?.password;

      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(401).json({ error: 'Email ou senha incorretos' });
      }

      const isValidPassword = await verifyPassword(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Email ou senha incorretos' });
      }

      const token = generateToken(user.id);
      const expiresAt = calculateExpiry();

      await User.createSession(user.id, token, expiresAt);

      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          avatar_url: user.avatar_url,
        },
      });
    } catch (error) {
      return handleAuthError(res, error, 'login');
    }
  },

  async logout(req, res) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (token) {
        await User.deleteSession(token);
      }
      res.json({ success: true, message: 'Logout realizado com sucesso' });
    } catch (error) {
      console.error('Erro no logout:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  async getProfile(req, res) {
    try {
      const userId = req.userId;
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({ error: 'Usuario nao encontrado' });
      }

      res.json({ success: true, user });
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  async verifyToken(req, res) {
    try {
      const token = req.headers.authorization?.split(' ')[1];

      if (!token) {
        return res.status(401).json({ valid: false });
      }

      const session = await User.findSessionByToken(token);
      if (!session) {
        return res.status(401).json({ valid: false });
      }

      const user = await User.findById(session.user_id);
      res.json({
        valid: true,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          avatar_url: user.avatar_url,
        },
      });
    } catch (_error) {
      res.status(401).json({ valid: false });
    }
  },

  googleAuth(req, res, next) {
    passport.authenticate('google', {
      scope: ['profile', 'email'],
    })(req, res, next);
  },

  googleCallback(req, res, next) {
    passport.authenticate('google', async (err, user) => {
      if (err || !user) {
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
      }

      try {
        const token = generateToken(user.id);
        const expiresAt = calculateExpiry();

        await User.createSession(user.id, token, expiresAt);

        return res.redirect(
          `${process.env.FRONTEND_URL}/auth/google/callback?token=${token}&user=${JSON.stringify({
            id: user.id,
            email: user.email,
            username: user.username,
            avatar_url: user.avatar_url,
          })}`,
        );
      } catch (error) {
        console.error('Erro no callback do Google:', error);
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=server_error`);
      }
    })(req, res, next);
  },

  async verifyGoogleAuth(req, res) {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({ error: 'Token nao fornecido' });
      }

      const session = await User.findSessionByToken(token);
      if (!session) {
        return res.status(401).json({ error: 'Token invalido' });
      }

      const user = await User.findById(session.user_id);

      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          avatar_url: user.avatar_url,
        },
      });
    } catch (error) {
      console.error('Erro na verificacao do Google:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  async requestPasswordReset(req, res) {
    try {
      const email = normalizeEmail(req.body?.email);

      if (!email) {
        return res.status(400).json({ error: 'Informe o email cadastrado.' });
      }

      await PasswordReset.ensureTable();
      await PasswordReset.deleteExpired();

      const user = await User.findByEmail(email);
      if (!user) {
        return res.json({
          success: true,
          message: 'Se o email estiver cadastrado, o codigo foi enviado.',
        });
      }

      await PasswordReset.invalidateActiveByUserId(user.id);

      const code = generateResetCode();
      const expiresAt = new Date(Date.now() + getResetCodeMinutes() * 60 * 1000);

      await PasswordReset.createResetCode({
        userId: user.id,
        email,
        code,
        expiresAt,
      });

      let devCode = null;

      try {
        await sendPasswordResetCode({
          to: email,
          username: user.username || user.name || '',
          code,
        });
      } catch (error) {
        if (!isEmailNotConfiguredError(error) || !canUseDevelopmentEmailFallback()) {
          throw error;
        }

        devCode = code;
        console.log(
          `[DEV][PASSWORD_RESET] Codigo para ${email}: ${code} (expira em ${getResetCodeMinutes()} min)`,
        );
      }

      return res.json({
        success: true,
        message: devCode
          ? 'SMTP nao configurado. Em desenvolvimento, use o codigo exibido abaixo ou no terminal do backend.'
          : 'Se o email estiver cadastrado, o codigo foi enviado.',
        ...(devCode ? { devCode } : {}),
      });
    } catch (error) {
      return handleAuthError(res, error, 'requestPasswordReset');
    }
  },

  async confirmPasswordReset(req, res) {
    try {
      const email = normalizeEmail(req.body?.email);
      const code = String(req.body?.code || '').trim();
      const password = String(req.body?.password || '');
      const confirmPassword = String(req.body?.confirmPassword || '');

      if (!email || !code || !password || !confirmPassword) {
        return res.status(400).json({
          error: 'Email, codigo, nova senha e confirmacao de senha sao obrigatorios.',
        });
      }

      if (!/^\d{6}$/.test(code)) {
        return res.status(400).json({ error: 'O codigo deve ter 6 digitos.' });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres.' });
      }

      if (password !== confirmPassword) {
        return res.status(400).json({ error: 'As senhas nao coincidem.' });
      }

      await PasswordReset.ensureTable();
      await PasswordReset.deleteExpired();

      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(400).json({ error: 'Codigo invalido ou expirado.' });
      }

      const resetEntry = await PasswordReset.findLatestActiveByUserId(user.id);
      if (!resetEntry) {
        return res.status(400).json({ error: 'Codigo invalido ou expirado.' });
      }

      if (resetEntry.attempts >= PasswordReset.MAX_RESET_ATTEMPTS) {
        await PasswordReset.markConsumed(resetEntry.id);
        return res.status(400).json({ error: 'Codigo invalido ou expirado.' });
      }

      const isValidCode = await PasswordReset.compareCode(resetEntry, code);
      if (!isValidCode) {
        const updatedEntry = await PasswordReset.incrementAttempts(resetEntry.id);
        if (updatedEntry?.attempts >= PasswordReset.MAX_RESET_ATTEMPTS) {
          await PasswordReset.markConsumed(resetEntry.id);
        }

        return res.status(400).json({ error: 'Codigo invalido ou expirado.' });
      }

      await User.updatePassword(user.id, password);
      await User.deleteSessionsByUserId(user.id);
      await PasswordReset.markConsumed(resetEntry.id);
      await PasswordReset.deleteExpired();

      return res.json({
        success: true,
        message: 'Senha atualizada com sucesso. Faca login com a nova senha.',
      });
    } catch (error) {
      return handleAuthError(res, error, 'confirmPasswordReset');
    }
  },
};

module.exports = authController;
