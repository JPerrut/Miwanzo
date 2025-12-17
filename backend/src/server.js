const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('./config/passport'); // Você vai criar este arquivo
require('dotenv').config();

const authRoutes = require('./routes/auth.routes');

const app = express();
const PORT = process.env.PORT || 5000;

// Configurações do CORS
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
}));

// Configuração de sessão (NECESSÁRIA para o Passport)
app.use(session({
  secret: process.env.JWT_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000, // 24 horas
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  }
}));

// Inicializar Passport
app.use(passport.initialize());
app.use(passport.session());

// Middleware para JSON
app.use(express.json());

// Rotas
app.use('/api/auth', authRoutes);

// Rota de saúde
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    googleAuth: process.env.GOOGLE_CLIENT_ID ? 'Configurado' : 'Não configurado'
  });
});

// Rota para teste do Google Auth
app.get('/api/auth/test', (req, res) => {
  res.json({
    googleClientId: process.env.GOOGLE_CLIENT_ID ? 'Configurado' : 'Não configurado',
    callbackUrl: process.env.GOOGLE_CALLBACK_URL,
    frontendUrl: process.env.FRONTEND_URL
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`🌐 Frontend: ${process.env.FRONTEND_URL}`);
  console.log(`🔐 Google Auth: ${process.env.GOOGLE_CLIENT_ID ? 'Configurado' : 'Não configurado'}`);
});