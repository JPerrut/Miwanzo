import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMoon, faSun } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';
import './SettingsPage.css';

const SettingsPage = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="settings-page">
      <div className="settings-content">
        <section className="settings-section">
          <div className="settings-section-head">
            <h3>Tema da interface</h3>
            <p>O tema e aplicado globalmente e fica salvo para os proximos acessos.</p>
          </div>

          <div className="theme-selector">
            <button
              type="button"
              className={`theme-option ${theme === 'light' ? 'active' : ''}`}
              onClick={() => setTheme('light')}
            >
              <div className="theme-option-icon">
                <FontAwesomeIcon icon={faSun} />
              </div>
              <div className="theme-option-copy">
                <h4>Modo claro</h4>
                <p>Superficies brancas, fundo gelo e destaque azul limpo.</p>
              </div>
            </button>

            <button
              type="button"
              className={`theme-option ${theme === 'dark' ? 'active' : ''}`}
              onClick={() => setTheme('dark')}
            >
              <div className="theme-option-icon">
                <FontAwesomeIcon icon={faMoon} />
              </div>
              <div className="theme-option-copy">
                <h4>Modo noturno</h4>
                <p>Paineis azul profundo, contraste suave e foco em leitura prolongada.</p>
              </div>
            </button>
          </div>
        </section>

        <section className="settings-grid">
          <article className="settings-card">
            <h3>Idioma</h3>
            <select defaultValue="pt-br">
              <option value="pt-br">Portugues (Brasil)</option>
              <option value="en">English</option>
              <option value="es">Espanol</option>
            </select>
          </article>

          <article className="settings-card">
            <h3>Fuso horario</h3>
            <select defaultValue="brasilia">
              <option value="brasilia">Brasilia (GMT-3)</option>
              <option value="utc">UTC</option>
              <option value="lisboa">Lisboa (GMT+0)</option>
            </select>
          </article>

          <article className="settings-card">
            <h3>Notificacoes</h3>
            <label className="settings-check">
              <input className="switch-input" type="checkbox" defaultChecked />
              <span className="switch-track" aria-hidden="true"></span>
              <span>Receber avisos por email</span>
            </label>
            <label className="settings-check">
              <input className="switch-input" type="checkbox" defaultChecked />
              <span className="switch-track" aria-hidden="true"></span>
              <span>Lembretes de tarefas</span>
            </label>
            <label className="settings-check">
              <input className="switch-input" type="checkbox" />
              <span className="switch-track" aria-hidden="true"></span>
              <span>Notificacoes push</span>
            </label>
          </article>
        </section>
      </div>
    </div>
  );
};

export default SettingsPage;
