const jwt = require('jsonwebtoken');

const authMiddleware = async (req, res, next) => {
  try {
    console.log('\n=== AUTH MIDDLEWARE ===');
    console.log('Método:', req.method);
    console.log('URL:', req.originalUrl);
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ Token não fornecido ou formato inválido');
      console.log('Auth Header recebido:', authHeader);
      return res.status(401).json({
        success: false,
        message: 'Token não fornecido ou inválido'
      });
    }
    
    const token = authHeader.split(' ')[1];
    console.log('✅ Token recebido (primeiros 30 chars):', token.substring(0, 30) + '...');
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('✅ Token decodificado com sucesso');
      console.log('Decoded payload:', decoded);
      
      req.userId = decoded.userId || decoded.id;
      req.user = { id: req.userId };
      
      console.log(`✅ userId definido: ${req.userId}`);
      console.log('=== FIM AUTH MIDDLEWARE ===\n');
      next();
    } catch (error) {
      console.log('❌ Erro ao verificar token:', error.message);
      console.log('Nome do erro:', error.name);
      
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expirado',
          error: error.message
        });
      }
      
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Token inválido',
          error: error.message
        });
      }
      
      return res.status(401).json({
        success: false,
        message: 'Erro na autenticação',
        error: error.message
      });
    }
  } catch (error) {
    console.error('❌ Erro no middleware de autenticação:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

module.exports = authMiddleware;