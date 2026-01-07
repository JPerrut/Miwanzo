const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const { Client } = require('pg');
const dotenv = require('dotenv');
const readline = require('readline');

const execAsync = promisify(exec);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function resetDatabase() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const answer = await new Promise(resolve => {
    rl.question('⚠️  ATENÇÃO: Isso irá APAGAR TODOS os dados do banco. Tem certeza? (s/n): ', resolve);
  });
  
  rl.close();

  if (answer.toLowerCase() !== 's') {
    console.log('❌ Operação cancelada.');
    return;
  }

  const config = {
    host: 'localhost',
    port: 5432,
    user: process.env.DATABASE_URL?.split(':')[1]?.split('//')[1] || 'miwanzo_user',
    password: process.env.DATABASE_URL?.split(':')[2]?.split('@')[0] || 'Miwanzo',
  };

  const dbName = process.env.DATABASE_URL?.split('/').pop() || 'miwanzo';

  console.log(`🗑️  Resetando banco de dados '${dbName}'...`);

  const client = new Client({
    ...config,
    database: 'postgres'
  });

  try {
    await client.connect();

    // Termina conexões ativas
    await client.query(`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = '${dbName}'
        AND pid <> pg_backend_pid();
    `);

    // Remove e recria o banco
    await client.query(`DROP DATABASE IF EXISTS ${dbName}`);
    await client.query(`CREATE DATABASE ${dbName}`);

    await client.end();

    // Executa migrações
    const prismaPath = path.join(__dirname, '..');
    await execAsync('npx prisma migrate deploy', { cwd: prismaPath });
    
    console.log('✅ Banco de dados resetado com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao resetar banco:', error.message);
    process.exit(1);
  }
}

resetDatabase();