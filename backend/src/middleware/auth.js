// backend/src/middlewares/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

const authMiddleware = async (req, res, next) => {
  try {
    console.log('🔐 Middleware de autenticação chamado para:', req.method, req.path);
    
    // Tentar obter o token do header Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ Token não fornecido ou inválido');
      return res.status(401).json({
        success: false,
        message: 'Token não fornecido ou inválido'
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
      // Verificar o token JWT
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('✅ Token JWT válido, userId:', decoded.userId || decoded.id);
      
      // Adicionar o usuário ao request
      req.userId = decoded.userId || decoded.id;
      req.user = { id: req.userId };
      console.log('✅ userId adicionado ao request:', req.userId);
      
      next();
    } catch (error) {
      console.error('❌ Erro na verificação do token:', error.message);
      
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expirado'
        });
      }
      
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Token inválido'
        });
      }
      
      return res.status(401).json({
        success: false,
        message: 'Erro na autenticação'
      });
    }
  } catch (error) {
    console.error('❌ Erro no middleware de autenticação:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

module.exports = authMiddleware;