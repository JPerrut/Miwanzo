// backend/database-setup.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'miwanzo',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
});

async function setupTables() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Configurando banco de dados...');
    
    // Verificar se a tabela users existe
    const usersCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      )
    `);
    
    if (!usersCheck.rows[0].exists) {
      console.error('❌ ERRO: Tabela users não existe!');
      console.error('Execute primeiro as migrations do sistema de autenticação.');
      process.exit(1);
    }
    
    console.log('✅ Tabela users encontrada');
    
    // SQL para criar as tabelas
    const sql = `
      -- Criar tabela work_areas
      CREATE TABLE IF NOT EXISTS work_areas (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        user_id UUID NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        CONSTRAINT fk_work_areas_user FOREIGN KEY (user_id) 
          REFERENCES users(id) ON DELETE CASCADE
      );

      -- Criar tabela sections
      CREATE TABLE IF NOT EXISTS sections (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        work_area_id UUID NOT NULL,
        user_id UUID NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        CONSTRAINT fk_sections_work_area FOREIGN KEY (work_area_id) 
          REFERENCES work_areas(id) ON DELETE CASCADE,
        CONSTRAINT fk_sections_user FOREIGN KEY (user_id) 
          REFERENCES users(id) ON DELETE CASCADE
      );

      -- Criar tabela tasks
      CREATE TABLE IF NOT EXISTS tasks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        section_id UUID NOT NULL,
        completed BOOLEAN DEFAULT FALSE,
        user_id UUID NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        CONSTRAINT fk_tasks_section FOREIGN KEY (section_id) 
          REFERENCES sections(id) ON DELETE CASCADE,
        CONSTRAINT fk_tasks_user FOREIGN KEY (user_id) 
          REFERENCES users(id) ON DELETE CASCADE
      );

      -- Criar índices
      CREATE INDEX IF NOT EXISTS idx_work_areas_user_id ON work_areas(user_id);
      CREATE INDEX IF NOT EXISTS idx_sections_work_area_id ON sections(work_area_id);
      CREATE INDEX IF NOT EXISTS idx_sections_user_id ON sections(user_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_section_id ON tasks(section_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed);
    `;
    
    await client.query(sql);
    console.log('✅ Tabelas criadas com sucesso!');
    
    // Verificar se as tabelas foram criadas
    const tables = ['work_areas', 'sections', 'tasks'];
    
    for (const table of tables) {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `, [table]);
      
      if (result.rows[0].exists) {
        console.log(`   ✅ ${table} criada`);
        
        // Contar registros
        const count = await client.query(`SELECT COUNT(*) FROM ${table}`);
        console.log(`     Registros: ${count.rows[0].count}`);
      } else {
        console.log(`   ❌ ${table} NÃO criada`);
      }
    }
    
    console.log('\n🎉 Configuração do banco concluída!');
    console.log('\n📋 Próximos passos:');
    console.log('   1. Inicie o servidor: npm run dev');
    console.log('   2. Acesse o frontend e crie uma área de trabalho');
    
  } catch (error) {
    console.error('❌ Erro ao configurar banco:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  setupTables();
}

module.exports = setupTables;