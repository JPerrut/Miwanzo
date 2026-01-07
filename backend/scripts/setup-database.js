const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const dotenv = require('dotenv');

const execAsync = promisify(exec);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function setupDatabaseForWindows() {
  console.log('🔧 Configuração do banco Miwanzo para Windows...');
  
  try {
    // Tenta diferentes combinações de credenciais
    const credentialsList = [
      { user: 'postgres', password: 'Admin', description: 'Padrão comum 1' },
    ];

    let successfulConnection = null;
    const dbName = 'miwanzo';

    // Testa cada combinação de credenciais
    for (const cred of credentialsList) {
      console.log(`\n🔑 Testando: ${cred.description} (${cred.user}:${cred.password})`);
      
      const testClient = new Client({
        host: 'localhost',
        port: 5432,
        user: cred.user,
        password: cred.password,
        database: 'postgres'
      });

      try {
        await testClient.connect();
        console.log(`✅ Conexão bem-sucedida!`);

        // Verifica se o banco já existe
        const result = await testClient.query(
          "SELECT 1 FROM pg_database WHERE datname = $1",
          [dbName]
        );

        if (result.rowCount === 0) {
          console.log(`📦 Criando banco '${dbName}'...`);
          await testClient.query(`CREATE DATABASE ${dbName}`);
          console.log(`✅ Banco '${dbName}' criado.`);
        } else {
          console.log(`📦 Banco '${dbName}' já existe.`);
        }

        // Se chegou aqui, a conexão funcionou
        successfulConnection = cred;
        
        // Atualiza o arquivo .env com as credenciais que funcionaram
        const envPath = path.join(__dirname, '..', '.env');
        let envContent = fs.readFileSync(envPath, 'utf8');
        
        // Substitui a DATABASE_URL
        const newDbUrl = `DATABASE_URL=postgresql://${cred.user}:${cred.password}@localhost:5432/${dbName}`;
        
        if (envContent.includes('DATABASE_URL=')) {
          envContent = envContent.replace(/DATABASE_URL=.*/g, newDbUrl);
        } else {
          envContent += `\n${newDbUrl}`;
        }
        
        fs.writeFileSync(envPath, envContent);
        console.log(`📝 .env atualizado com: ${newDbUrl}`);
        
        await testClient.end();
        break; // Sai do loop quando encontra uma conexão que funciona
        
      } catch (error) {
        console.log(`❌ Falha: ${error.message}`);
        if (testClient) {
          try { await testClient.end(); } catch {}
        }
      }
    }

    if (!successfulConnection) {
      console.log('\n❌ Nenhuma credencial funcionou automaticamente.');
      console.log('\n🔧 Configure manualmente:');
      console.log('1. Abra pgAdmin 4 (instalado com PostgreSQL)');
      console.log('2. Conecte-se ao servidor PostgreSQL');
      console.log('3. Crie um banco chamado "miwanzo"');
      console.log('4. Edite o arquivo .env com suas credenciais');
      console.log('5. Execute manualmente:');
      console.log('   npx prisma generate');
      console.log('   npx prisma db push');
      return;
    }

    // Agora executa os comandos do Prisma
    console.log('\n🔄 Gerando cliente Prisma...');
    await execAsync('npx prisma generate', { cwd: path.join(__dirname, '..') });
    console.log('✅ Cliente Prisma gerado.');

    console.log('\n🚀 Criando/atualizando tabelas...');
    await execAsync('npx prisma db push', { cwd: path.join(__dirname, '..') });
    console.log('✅ Tabelas criadas/atualizadas.');

    console.log('\n✨ Banco de dados configurado com sucesso!');
    console.log('\n📊 Para iniciar:');
    console.log('1. Inicie o servidor: npm run dev');
    console.log('2. Acesse: http://localhost:5000');
    console.log('3. Prisma Studio: npx prisma studio');

  } catch (error) {
    console.error('\n❌ Erro geral:', error.message);
    
    // Tenta uma abordagem mais simples
    console.log('\n🔄 Tentando abordagem alternativa...');
    try {
      await execAsync('npx prisma generate', { cwd: path.join(__dirname, '..') });
      await execAsync('npx prisma db push --accept-data-loss', { cwd: path.join(__dirname, '..') });
      console.log('✅ Configuração alternativa concluída!');
    } catch (altError) {
      console.error('❌ Falha na abordagem alternativa:', altError.message);
      console.log('\n🔧 Instruções manuais:');
      console.log('1. Verifique se PostgreSQL está rodando (services.msc)');
      console.log('2. Abra pgAdmin e crie banco "miwanzo"');
      console.log('3. Execute: npx prisma generate');
      console.log('4. Execute: npx prisma db push');
    }
  }
}

// Script SIMPLES que funciona na maioria dos casos
async function setupDatabaseSimple() {
  console.log('🚀 Configuração simples do banco Miwanzo');
  
  try {
    // Primeiro tenta usar as credenciais do .env
    console.log('🔍 Usando credenciais do arquivo .env...');
    
    // Gera o cliente Prisma
    console.log('🔄 Gerando cliente Prisma...');
    await execAsync('npx prisma generate');
    
    // Tenta criar o banco e tabelas
    console.log('🚀 Criando banco e tabelas...');
    await execAsync('npx prisma db push --accept-data-loss');
    
    console.log('✅ Banco configurado com sucesso!');
    console.log('👉 Execute: npm run dev');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    
    console.log('\n🔧 Solução manual:');
    console.log('1. Certifique-se que o PostgreSQL está instalado e rodando');
    console.log('2. Abra pgAdmin e crie um banco chamado "miwanzo"');
    console.log('3. No arquivo backend/.env, configure:');
    console.log('   DATABASE_URL=postgresql://SEU_USUARIO:SUA_SENHA@localhost:5432/miwanzo');
    console.log('4. Execute: npx prisma generate');
    console.log('5. Execute: npx prisma db push');
  }
}

// Executa a função apropriada
if (process.platform === 'win32') {
  // Para Windows, vamos tentar a versão simples primeiro
  setupDatabaseSimple();
} else {
  setupDatabaseSimple();
}