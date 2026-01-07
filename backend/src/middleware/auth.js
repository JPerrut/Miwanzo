const jwt = require('jsonwebtoken');

const authMiddleware = async (req, res, next) => {
  try {
    console.log('Auth Middleware - Headers:', req.headers.authorization);
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('Auth Middleware - Token não fornecido');
      return res.status(401).json({
        success: false,
        message: 'Token não fornecido ou inválido'
      });
    }
    
    const token = authHeader.split(' ')[1];
    console.log('Auth Middleware - Token recebido:', token.substring(0, 20) + '...');
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Auth Middleware - Token decodificado:', decoded);
      
      req.userId = decoded.userId || decoded.id;
      req.user = { id: req.userId };
      
      console.log('Auth Middleware - userId definido:', req.userId);
      next();
    } catch (error) {
      console.log('Auth Middleware - Erro ao verificar token:', error.message);
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
    console.error('Erro no middleware de autenticação:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

module.exports = authMiddleware;