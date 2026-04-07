const User = require('../models/user.model');
const { generateToken, verifyPassword, calculateExpiry } = require('../utils/auth.utils');
const passport = require('../config/passport');

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

  return res.status(500).json({ error: 'Erro interno do servidor' });
}

const authController = {
  async register(req, res) {
    try {
      const { email, username, password, confirmPassword } = req.body;

      if (password !== confirmPassword) {
        return res.status(400).json({ error: 'As senhas não coincidem' });
      }

      const existingEmail = await User.findByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ error: 'Email já cadastrado' });
      }

      const existingUsername = await User.findByUsername(username);
      if (existingUsername) {
        return res.status(400).json({ error: 'Nome de usuário já em uso' });
      }

      const userData = {
        email,
        username,
        password,
      };

      const user = await User.create(userData);

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
      const { email, password } = req.body;

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
        return res.status(404).json({ error: 'Usuário não encontrado' });
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
    } catch (error) {
      res.status(401).json({ valid: false });
    }
  },

  googleAuth(req, res, next) {
    passport.authenticate('google', {
      scope: ['profile', 'email']
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

        res.redirect(`${process.env.FRONTEND_URL}/auth/google/callback?token=${token}&user=${JSON.stringify({
          id: user.id,
          email: user.email,
          username: user.username,
          avatar_url: user.avatar_url,
        })}`);
      } catch (error) {
        console.error('Erro no callback do Google:', error);
        res.redirect(`${process.env.FRONTEND_URL}/login?error=server_error`);
      }
    })(req, res, next);
  },

  async verifyGoogleAuth(req, res) {
    try {
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({ error: 'Token não fornecido' });
      }

      const session = await User.findSessionByToken(token);
      if (!session) {
        return res.status(401).json({ error: 'Token inválido' });
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
      console.error('Erro na verificação do Google:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },
};

module.exports = authController;
