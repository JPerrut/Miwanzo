import React from 'react'
import './TasksPage.css'

const TasksPage = () => {
  return (
    <div className="tasks-page">
      <header className="page-header">
        <h1>Área de Tarefas</h1>
        <p>Gerencie suas tarefas e projetos</p>
      </header>
      
      <div className="tasks-content">
        <div className="tasks-container">
          <div className="tasks-column">
            <h3>Para Fazer</h3>
            <div className="task-list">
              <div className="task-item">
                <h4>Configurar rotas do projeto</h4>
                <p>Configurar React Router para navegação</p>
              </div>
              <div className="task-item">
                <h4>Criar formulário de tarefas</h4>
                <p>Desenvolver formulário para criar novas tarefas</p>
              </div>
            </div>
          </div>
          
          <div className="tasks-column">
            <h3>Em Progresso</h3>
            <div className="task-list">
              <div className="task-item">
                <h4>Criar componente Sidebar</h4>
                <p>Desenvolver menu lateral colapsável</p>
              </div>
              <div className="task-item">
                <h4>Implementar sistema de temas</h4>
                <p>Adicionar suporte para tema claro e escuro</p>
              </div>
            </div>
          </div>
          
          <div className="tasks-column">
            <h3>Concluído</h3>
            <div className="task-list">
              <div className="task-item">
                <h4>Configurar projeto React</h4>
                <p>Inicializar projeto com Vite e React Router</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TasksPage