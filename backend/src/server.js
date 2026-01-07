const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('./config/passport');
require('dotenv').config();

const authRoutes = require('./routes/auth.routes');
const workAreasRoutes = require('./routes/workAreas');
const sectionsRoutes = require('./routes/sections');
const tasksRoutes = require('./routes/tasks');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
}));

app.use(session({
  secret: process.env.JWT_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  }
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(express.json());

app.use('/api/auth', authRoutes);

// USANDO APENAS auth.js (função direta)
const authMiddleware = require('./middleware/auth');

app.use('/api/work-areas', authMiddleware, workAreasRoutes);
app.use('/api/sections', authMiddleware, sectionsRoutes);
app.use('/api/tasks', authMiddleware, tasksRoutes);

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

app.get('/api/auth/test', (req, res) => {
  res.json({
    googleClientId: process.env.GOOGLE_CLIENT_ID ? 'Configurado' : 'Não configurado',
    callbackUrl: process.env.GOOGLE_CALLBACK_URL,
    frontendUrl: process.env.FRONTEND_URL
  });
});

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
        list: 'GET /api/sections?work_area_id=:id',
        get: 'GET /api/sections/:id',
        delete: 'DELETE /api/sections/:id'
      },
      tasks: {
        create: 'POST /api/tasks',
        list: 'GET /api/tasks?section_id=:id',
        update: 'PUT /api/tasks/:id',
        delete: 'DELETE /api/tasks/:id'
      }
    }
  });
});

app.get('/api/auth/test-middleware', authMiddleware, (req, res) => {
  res.json({
    success: true,
    message: 'Middleware funcionando!',
    userId: req.userId,
    user: req.user
  });
});

// Rota de debug para verificar o que o middleware está definindo
app.get('/api/debug-auth', authMiddleware, (req, res) => {
  res.json({
    success: true,
    userId: req.userId,
    user: req.user,
    headers: {
      authorization: req.headers.authorization?.substring(0, 30) + '...'
    }
  });
});

app.use((err, req, res, next) => {
  console.error('Erro no servidor:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Erro interno do servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Rota não encontrada',
    path: req.originalUrl
  });
});

async function checkDatabase() {
  try {
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: false
    });

    const tables = ['work_areas', 'sections', 'tasks', 'users', 'user_sessions'];
    const client = await pool.connect();
    
    console.log('Tabelas encontradas:');
    for (const table of tables) {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `, [table]);
      
      if (result.rows[0].exists) {
        console.log(`   ${table}`);
      } else {
        console.log(`   ${table} (NÃO ENCONTRADA)`);
      }
    }
    
    client.release();
    await pool.end();
  } catch (error) {
    console.error('Erro ao verificar banco:', error.message);
  }
}

checkDatabase();

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Frontend: ${process.env.FRONTEND_URL}`);
  console.log(`Google Auth: ${process.env.GOOGLE_CLIENT_ID ? 'Configurado' : 'Não configurado'}`);
  console.log(`Novas funcionalidades:`);
  console.log(`   • Áreas de trabalho: /api/work-areas`);
  console.log(`   • Seções: /api/sections`);
  console.log(`   • Tarefas: /api/tasks`);
  console.log(`Para testar:`);
  console.log(`   • Saúde do servidor: http://localhost:${PORT}/api/health`);
  console.log(`   • Rotas disponíveis: http://localhost:${PORT}/api/test-routes`);
  console.log(`   • Teste de middleware: http://localhost:${PORT}/api/auth/test-middleware`);
  console.log(`   • Debug auth: http://localhost:${PORT}/api/debug-auth`);
});