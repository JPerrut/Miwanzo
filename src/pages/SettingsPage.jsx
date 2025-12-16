import React, { useState } from 'react'
import './SettingsPage.css'

const SettingsPage = () => {
  const [selectedTheme, setSelectedTheme] = useState('claro')

  return (
    <div className="settings-page">
      <header className="page-header">
        <h1>Configurações</h1>
        <p>Ajuste as preferências do sistema</p>
      </header>
      
      <div className="settings-content">
        <div className="settings-section">
          <h3>Preferências do Sistema</h3>
          
          <div className="settings-item">
            <label>Tema da Interface</label>
            <div className="theme-selector">
              <div 
                className={`theme-option ${selectedTheme === 'claro' ? 'active' : ''}`}
                onClick={() => setSelectedTheme('claro')}
              >
                <h4>Tema Claro</h4>
                <p>Interface com cores claras</p>
              </div>
              
              <div 
                className={`theme-option ${selectedTheme === 'escuro' ? 'active' : ''}`}
                onClick={() => setSelectedTheme('escuro')}
              >
                <h4>Tema Escuro</h4>
                <p>Interface com cores escuras</p>
              </div>
            </div>
          </div>
          
          <div className="settings-item">
            <label>Idioma</label>
            <select>
              <option>Português (Brasil)</option>
              <option>English</option>
              <option>Español</option>
            </select>
          </div>
          
          <div className="settings-item">
            <label>Fuso Horário</label>
            <select>
              <option>Brasília (GMT-3)</option>
              <option>UTC</option>
              <option>Londres (GMT+0)</option>
            </select>
          </div>
        </div>
        
        <div className="settings-section">
          <h3>Notificações</h3>
          
          <div className="settings-item">
            <label>
              <input type="checkbox" defaultChecked />
              Notificações por email
            </label>
          </div>
          
          <div className="settings-item">
            <label>
              <input type="checkbox" defaultChecked />
              Lembretes de tarefas
            </label>
          </div>
          
          <div className="settings-item">
            <label>
              <input type="checkbox" />
              Notificações push
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsPage