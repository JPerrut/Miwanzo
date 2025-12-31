🚀 Miwanzo - Plataforma de Gerenciamento
Miwanzo (que significa "inícios" em suaíli) é uma plataforma moderna de gerenciamento com sistema completo de autenticação e interface responsiva. O projeto utiliza uma arquitetura full-stack com frontend em Vite e backend em Node.js/Express.

https://img.shields.io/badge/JavaScript-72.2%2525-yellow
https://img.shields.io/badge/CSS-27.3%2525-blue
https://img.shields.io/badge/Node.js-18%252B-green
https://img.shields.io/badge/PostgreSQL-15%252B-blue

✨ Funcionalidades
✅ Autenticação completa - Login, registro e recuperação de senha

✅ Login com Google OAuth - Integração com Google Cloud Platform

✅ JWT Tokens - Autenticação segura com JSON Web Tokens

✅ Menu de usuário - Dropdown com avatar no canto superior direito

✅ Rotas protegidas - Acesso controlado por nível de autenticação

✅ Persistência de login - Armazenamento seguro no localStorage

✅ Validação de formulários - Frontend e backend

✅ Layout responsivo - Compatível com dispositivos móveis

✅ Banco de dados PostgreSQL - Armazenamento persistente de usuários e sessões

🏗️ Arquitetura do Projeto

Miwanzo/
├── backend/                 # API Node.js/Express
│   ├── controllers/        # Lógica de negócio
│   ├── models/            # Modelos de dados
│   ├── routes/            # Definição de rotas da API
│   ├── middleware/        # Middlewares (auth, validation)
│   ├── config/            # Configurações do banco de dados
│   └── server.js          # Ponto de entrada do backend
├── src/                   # Aplicação frontend
│   ├── components/        # Componentes React reutilizáveis
│   ├── pages/            # Páginas da aplicação
│   ├── services/         # Serviços API e utilitários
│   ├── styles/           # Estilos CSS/SCSS
│   └── App.jsx           # Componente raiz
├── public/                # Arquivos estáticos
├── package.json           # Dependências e scripts
├── vite.config.js        # Configuração do Vite
└── .env                  # Variáveis de ambiente
🚀 Começando
Pré-requisitos
Node.js (versão 18 ou superior)

PostgreSQL (versão 15 ou superior)

npm ou yarn

Conta no Google Cloud Platform (para OAuth)

Instalação
Clone o repositório

bash
git clone https://github.com/JPerrut/Miwanzo.git
cd Miwanzo
Instale as dependências

bash
# Instalar dependências do frontend e backend
npm run install:all
Configure o banco de dados PostgreSQL

sql
CREATE DATABASE miwanzo;
CREATE USER miwanzo_user WITH PASSWORD 'sua_senha_segura';
GRANT ALL PRIVILEGES ON DATABASE miwanzo TO miwanzo_user;
Configure as variáveis de ambiente

bash
# Crie um arquivo .env na raiz do projeto com:
DB_HOST=localhost
DB_PORT=5432
DB_NAME=miwanzo
DB_USER=miwanzo_user
DB_PASSWORD=sua_senha_segura
JWT_SECRET=sua_chave_jwt_super_secreta
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:3000
Configure o Google OAuth

Acesse Google Cloud Console

Crie um novo projeto ou selecione um existente

Vá para "APIs e Serviços" > "Credenciais"

Clique em "Criar Credenciais" > "ID do cliente OAuth"

Adicione URIs de redirecionamento:

http://localhost:3000/auth/google/callback

http://localhost:5173

Adicione ao seu .env:

text
GOOGLE_CLIENT_ID=seu_client_id
GOOGLE_CLIENT_SECRET=seu_client_secret
Executando a Aplicação
Opção 1: Frontend e Backend Separados
bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
npm run dev
Opção 2: Ambos Juntos (recomendado para desenvolvimento)
bash
# Usa concurrently para rodar ambos
npm run dev:full
Opção 3: Produção
bash
# Build do frontend
npm run build

# Iniciar backend em produção
cd backend
npm start
A aplicação estará disponível em:

Frontend: http://localhost:5173

Backend API: http://localhost:3000

🔧 Scripts Disponíveis
Script	Descrição
npm run dev	Inicia apenas o frontend
npm run dev:full	Inicia frontend e backend simultaneamente
npm run build	Cria build de produção do frontend
npm run preview	Visualiza build de produção localmente
npm run lint	Executa ESLint para análise de código
cd backend && npm run dev	Inicia apenas o backend
npm run install:all	Instala dependências de frontend e backend
📡 API Endpoints
Autenticação
Método	Endpoint	Descrição
POST	/api/auth/register	Registro de novo usuário
POST	/api/auth/login	Login com email/senha
POST	/api/auth/google	Login com Google OAuth
GET	/api/auth/logout	Logout do usuário
GET	/api/auth/me	Obter dados do usuário atual
Usuários
Método	Endpoint	Descrição
GET	/api/users	Listar todos os usuários
GET	/api/users/:id	Obter usuário específico
PUT	/api/users/:id	Atualizar usuário
DELETE	/api/users/:id	Remover usuário
🗄️ Modelos de Banco de Dados
Tabela users
Campo	Tipo	Descrição
id	SERIAL PRIMARY KEY	Identificador único
name	VARCHAR(100)	Nome completo
email	VARCHAR(255) UNIQUE	Email do usuário
password	VARCHAR(255)	Hash da senha
avatar	TEXT	URL do avatar
google_id	VARCHAR(255)	ID do Google (OAuth)
created_at	TIMESTAMP	Data de criação
updated_at	TIMESTAMP	Data de atualização
Tabela sessions
Campo	Tipo	Descrição
id	SERIAL PRIMARY KEY	Identificador único
user_id	INTEGER REFERENCES users(id)	Referência ao usuário
token	TEXT	Token JWT
expires_at	TIMESTAMP	Data de expiração
created_at	TIMESTAMP	Data de criação
🎨 Guia de Desenvolvimento
Adicionar um Novo Componente
Crie o componente em src/components/

Exporte como padrão ou nomeado

Importe no componente pai

Adicionar uma Nova Rota no Backend
Crie um arquivo de rota em backend/routes/

Importe no server.js

Defina os endpoints e conecte aos controllers

Adicionar uma Nova Página no Frontend
Crie a página em src/pages/

Adicione a rota no componente de roteamento principal

Implemente a lógica e estilização

Estrutura de um Componente React
jsx
import React, { useState, useEffect } from 'react';
import './MeuComponente.css';

const MeuComponente = ({ prop1, prop2 }) => {
  const [estado, setEstado] = useState('');
  
  useEffect(() => {
    // Lógica de inicialização
  }, []);
  
  const handleClick = () => {
    // Manipulador de eventos
  };
  
  return (
    <div className="meu-componente">
      {/* JSX aqui */}
    </div>
  );
};

export default MeuComponente;
🔒 Segurança
JWT Tokens: Autenticação stateless com tokens de acesso

Senhas Hash: Armazenamento seguro com bcrypt

CORS Configurado: Apenas origens permitidas

Validation: Validação de entrada em frontend e backend

Environment Variables: Configurações sensíveis no .env

📱 Responsividade
O projeto utiliza CSS moderno com:

Flexbox e Grid para layouts

Media queries para breakpoints

Unidades relativas (rem, %)

Design mobile-first