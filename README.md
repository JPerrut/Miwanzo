Executar Aplicação

# Opção 1: Separado
# Terminal 1: Frontend
npm run dev

# Terminal 2: Backend
cd backend
npm run dev

# Opção 2: Juntos (com concurrently)
npm run dev:full

8. Resumo do que foi implementado:
✅ PostgreSQL configurado com tabelas de usuários e sessões

✅ Backend Node.js/Express com autenticação JWT

✅ Sistema de login/registro completo

✅ UserMenu no canto superior direito com avatar dropdown

✅ Rotas protegidas - só acessa se estiver logado

✅ Persistência de login com localStorage

✅ Validação de formulários no frontend e backend

✅ Layout responsivo para todas as páginas

Agora você tem um sistema completo com:

Cadastro e login com email/senha

Opção "Manter logado"

Menu de usuário no canto superior direito

Proteção de rotas

Banco de dados PostgreSQL

O próximo passo seria implementar o login com Google (precisa de credenciais do Google Cloud) e começar a criar as funcionalidades de gerenciamento de tarefas!