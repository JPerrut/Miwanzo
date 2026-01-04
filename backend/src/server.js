// backend/src/server.js
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('./config/passport');
require('dotenv').config();

const authRoutes = require('./routes/auth.routes');

// Importar as novas rotas
const workAreasRoutes = require('./routes/workAreas');
const sectionsRoutes = require('./routes/sections');
const tasksRoutes = require('./routes/tasks');

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

// Rotas de autenticação
app.use('/api/auth', authRoutes);

// Tentar carregar middleware de autenticação JWT
let authMiddleware;
try {
  authMiddleware = require('./middleware/auth');
  console.log('✅ Middleware de autenticação carregado');
} catch (error) {
  console.error('❌ Erro ao carregar middleware de autenticação:', error.message);
  console.log('⚠️  Criando middleware básico...');
  
  // Criar middleware básico se o arquivo não existir
  authMiddleware = (req, res, next) => {
    console.log('⚠️  Middleware básico sendo usado (sem verificação real)');
    // Para desenvolvimento, aceita qualquer token
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      // Tentar decodificar o token
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.userId || decoded.id;
      } catch (error) {
        // Se falhar, usar um ID padrão para desenvolvimento
        req.userId = 'dev-user-id';
      }
    } else {
      req.userId = 'dev-user-id';
    }
    next();
  };
}

// NOVAS ROTAS - Áreas de trabalho, seções e tarefas (PROTEGIDAS)
app.use('/api/work-areas', authMiddleware, workAreasRoutes);
app.use('/api/sections', authMiddleware, sectionsRoutes);
app.use('/api/tasks', authMiddleware, tasksRoutes);

// Rota de saúde
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    googleAuth: process.env.GOOGLE_CLIENT_ID ? 'Configurado' : 'Não configurado',
    features: {
      workAreas: true,
      sections: true,
      tasks: true
    }
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

// Rota de teste para as novas funcionalidades
app.get('/api/test-routes', (req, res) => {
  res.json({
    routes: {
      workAreas: {
        create: 'POST /api/work-areas',
        list: 'GET /api/work-areas',
        get: 'GET /api/work-areas/:id',
        update: 'PUT /api/work-areas/:id',
        delete: 'DELETE /api/work-areas/:id'
      },
      sections: {
        create: 'POST /api/sections',
        list: 'GET /api/sections?workAreaId=:id',
        get: 'GET /api/sections/:id',
        delete: 'DELETE /api/sections/:id'
      },
      tasks: {
        create: 'POST /api/tasks',
        list: 'GET /api/tasks?sectionId=:id',
        update: 'PUT /api/tasks/:id',
        delete: 'DELETE /api/tasks/:id'
      }
    }
  });
});

// Rota de teste para verificar autenticação
app.get('/api/auth/test-middleware', authMiddleware, (req, res) => {
  res.json({
    success: true,
    message: 'Middleware funcionando!',
    userId: req.userId
  });
});

// Middleware de erro global
app.use((err, req, res, next) => {
  console.error('❌ Erro no servidor:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Erro interno do servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Rota 404 para endpoints não encontrados
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Rota não encontrada',
    path: req.originalUrl
  });
});

// Função para verificar/configurar banco
async function checkDatabase() {
  try {
    console.log('🔍 Verificando conexão com o banco de dados...');
    
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: false
    });

    // Verificar tabelas essenciais
    const tables = ['work_areas', 'sections', 'tasks', 'users', 'user_sessions'];
    const client = await pool.connect();
    
    console.log('📊 Tabelas encontradas:');
    for (const table of tables) {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `, [table]);
      
      if (result.rows[0].exists) {
        console.log(`   ✅ ${table}`);
      } else {
        console.log(`   ❌ ${table} (NÃO ENCONTRADA)`);
      }
    }
    
    client.release();
    await pool.end();
  } catch (error) {
    console.error('❌ Erro ao verificar banco:', error.message);
    console.log('💡 Verifique se o PostgreSQL está rodando e as tabelas foram criadas');
  }
}

// Verificar banco antes de iniciar
checkDatabase();

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`🌐 Frontend: ${process.env.FRONTEND_URL}`);
  console.log(`🔐 Google Auth: ${process.env.GOOGLE_CLIENT_ID ? 'Configurado' : 'Não configurado'}`);
  console.log(`📁 Novas funcionalidades:`);
  console.log(`   • Áreas de trabalho: /api/work-areas`);
  console.log(`   • Seções: /api/sections`);
  console.log(`   • Tarefas: /api/tasks`);
  console.log(`\n📋 Para testar:`);
  console.log(`   • Saúde do servidor: http://localhost:${PORT}/api/health`);
  console.log(`   • Rotas disponíveis: http://localhost:${PORT}/api/test-routes`);
  console.log(`   • Teste de middleware: http://localhost:${PORT}/api/auth/test-middleware`);
});