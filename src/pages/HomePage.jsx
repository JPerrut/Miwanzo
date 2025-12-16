import React from 'react'
import './HomePage.css'

const HomePage = () => {
  return (
    <div className="home-page">
      <header className="page-header">
        <h1>Página Inicial</h1>
        <p>Bem-vindo ao Miwanzo - Seu gerenciador de tarefas</p>
      </header>
      
      <div className="dashboard-cards">
        <div className="card">
          <h3>Tarefas Pendentes</h3>
          <p className="count">12</p>
          <button className="card-btn">Ver Tarefas</button>
        </div>
        
        <div className="card">
          <h3>Projetos Ativos</h3>
          <p className="count">3</p>
          <button className="card-btn">Ver Projetos</button>
        </div>
        
        <div className="card">
          <h3>Em Andamento</h3>
          <p className="count">8</p>
          <button className="card-btn">Ver Detalhes</button>
        </div>
      </div>
    </div>
  )
}

export default HomePage