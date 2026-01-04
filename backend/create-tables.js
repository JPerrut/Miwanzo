// backend/create-tables.js
const { pool } = require('./config/database');

async function createTables() {
  console.log('🔧 Criando tabelas para Áreas de Trabalho...');
  
  try {
    // Conectar ao banco
    const client = await pool.connect();
    console.log('✅ Conectado ao banco de dados');
    
    // 1. Criar tabela work_areas
    console.log('\n📋 1. Criando tabela work_areas...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS work_areas (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        user_id UUID NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_work_areas_user FOREIGN KEY (user_id) 
          REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('   ✅ Tabela work_areas criada');
    
    // 2. Criar tabela sections
    console.log('\n📋 2. Criando tabela sections...');
    await client.query(`
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
      )
    `);
    console.log('   ✅ Tabela sections criada');
    
    // 3. Criar tabela tasks
    console.log('\n📋 3. Criando tabela tasks...');
    await client.query(`
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
      )
    `);
    console.log('   ✅ Tabela tasks criada');
    
    // 4. Criar índices
    console.log('\n📋 4. Criando índices...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_work_areas_user_id ON work_areas(user_id);
      CREATE INDEX IF NOT EXISTS idx_sections_work_area_id ON sections(work_area_id);
      CREATE INDEX IF NOT EXISTS idx_sections_user_id ON sections(user_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_section_id ON tasks(section_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed);
    `);
    console.log('   ✅ Índices criados');
    
    // 5. Verificar as tabelas criadas
    console.log('\n🔍 Verificando tabelas...');
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
        console.log(`   ✅ ${table} - OK`);
      } else {
        console.log(`   ❌ ${table} - FALHOU`);
      }
    }
    
    console.log('\n🎉 Tabelas criadas com sucesso!');
    console.log('\n📋 Próximos passos:');
    console.log('   1. Inicie o servidor: npm run dev');
    console.log('   2. Teste as novas rotas');
    
  } catch (error) {
    console.error('❌ Erro ao criar tabelas:', error.message);
    
    // Se der erro de foreign key, tente versão sem FK
    if (error.message.includes('users')) {
      console.log('\n💡 Tentando criar sem foreign keys...');
      await createTablesWithoutFK();
    }
  } finally {
    // Não feche o pool global
    process.exit();
  }
}

// Versão alternativa sem foreign keys
async function createTablesWithoutFK() {
  try {
    const client = await pool.connect();
    
    // 1. work_areas sem FK
    await client.query(`
      CREATE TABLE IF NOT EXISTS work_areas (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 2. sections com FK só para work_areas
    await client.query(`
      CREATE TABLE IF NOT EXISTS sections (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        work_area_id UUID NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_sections_work_area FOREIGN KEY (work_area_id) 
          REFERENCES work_areas(id) ON DELETE CASCADE
      )
    `);
    
    // 3. tasks com FK só para sections
    await client.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        section_id UUID NOT NULL,
        completed BOOLEAN DEFAULT FALSE,
        user_id VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_tasks_section FOREIGN KEY (section_id) 
          REFERENCES sections(id) ON DELETE CASCADE
      )
    `);
    
    console.log('✅ Tabelas criadas sem foreign keys para users');
    
  } catch (error) {
    console.error('❌ Erro mesmo sem FK:', error.message);
  }
}

// Executar
createTables();