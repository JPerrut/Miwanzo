const { Client } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

async function checkDatabaseStructure() {
  console.log('🔍 ANALISANDO ESTRUTURA COMPLETA DO BANCO DE DADOS\n');
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Admin@localhost:5432/miwanzo'
  });

  try {
    await client.connect();
    console.log('✅ Conectado ao banco de dados\n');

    // 1. LISTA TODAS AS TABELAS
    console.log('📋 TABELAS EXISTENTES:');
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    tablesRes.rows.forEach(table => {
      console.log(`  • ${table.table_name}`);
    });

    console.log('\n' + '='.repeat(60) + '\n');

    // 2. VERIFICA CADA TABELA DETALHADAMENTE
    for (const table of tablesRes.rows) {
      console.log(`📊 TABELA: ${table.table_name.toUpperCase()}`);
      console.log('-'.repeat(40));
      
      const columnsRes = await client.query(`
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns 
        WHERE table_name = $1 
        ORDER BY ordinal_position
      `, [table.table_name]);
      
      if (columnsRes.rows.length === 0) {
        console.log('  (vazia ou sem colunas)');
      } else {
        console.log('  COLUNA'.padEnd(25) + 'TIPO'.padEnd(20) + 'NULO'.padEnd(10) + 'DEFAULT');
        console.log('  '.padEnd(25, '-') + ' '.padEnd(20, '-') + ' '.padEnd(10, '-') + ' '.padEnd(20, '-'));
        
        columnsRes.rows.forEach(col => {
          const nullable = col.is_nullable === 'YES' ? 'SIM' : 'NÃO';
          const defaultValue = col.column_default ? col.column_default.substring(0, 30) : '';
          console.log(`  ${col.column_name.padEnd(23)} ${col.data_type.padEnd(18)} ${nullable.padEnd(8)} ${defaultValue}`);
        });
      }
      
      console.log('\n');
    }

    // 3. VERIFICA RELAÇÕES E CHAVES ESTRANGEIRAS
    console.log('🔗 RELAÇÕES (FOREIGN KEYS):');
    const fksRes = await client.query(`
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
      ORDER BY tc.table_name, kcu.column_name
    `);
    
    if (fksRes.rows.length === 0) {
      console.log('  Nenhuma foreign key encontrada');
    } else {
      fksRes.rows.forEach(fk => {
        console.log(`  ${fk.table_name}.${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
      });
    }

  } catch (error) {
    console.error('❌ ERRO:', error.message);
    console.log('\n🔧 Soluções:');
    console.log('1. Verifique se o PostgreSQL está rodando');
    console.log('2. Verifique sua DATABASE_URL no .env');
    console.log('3. Execute: services.msc e inicie o PostgreSQL');
  } finally {
    await client.end();
  }
}

checkDatabaseStructure();