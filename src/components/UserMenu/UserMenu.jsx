import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faUser, 
  faCog, 
  faSignOutAlt,
  faChevronDown,
  faUserCircle
} from '@fortawesome/free-solid-svg-icons';
import { authService } from '../../services/auth';
import './UserMenu.css';

const UserMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState(null);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Carregar dados do usuário do localStorage
    const authData = authService.getAuthData();
    if (authData.user) {
      setUser(authData.user);
    }

    // Fechar menu ao clicar fora
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await authService.logout();
      authService.clearAuthData();
      navigate('/login');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  const menuItems = [
    {
      label: 'Meu Perfil',
      icon: faUser,
      onClick: () => navigate('/settings/profile'),
    },
    {
      label: 'Configurações',
      icon: faCog,
      onClick: () => navigate('/settings'),
    },
    {
      label: 'Sair',
      icon: faSignOutAlt,
      onClick: handleLogout,
      className: 'logout-item',
    },
  ];

  if (!user) return null;

  return (
    <div className="user-menu-container" ref={menuRef}>
      <button 
        className="user-menu-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label="Menu do usuário"
      >
        <div className="user-avatar">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt={user.full_name} />
          ) : (
            <FontAwesomeIcon icon={faUserCircle} />
          )}
        </div>
        <span className="user-name">{user.username}</span>
        <FontAwesomeIcon 
          icon={faChevronDown} 
          className={`chevron ${isOpen ? 'open' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="user-menu-dropdown">
          <div className="user-info-card">
            <div className="user-info-avatar">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={user.full_name} />
              ) : (
                <FontAwesomeIcon icon={faUserCircle} />
              )}
            </div>
            <div className="user-info-details">
              <h4 className="user-info-name">{user.full_name}</h4>
              <p className="user-info-email">{user.email}</p>
            </div>
          </div>

          <div className="user-menu-divider"></div>

          <ul className="user-menu-items">
            {menuItems.map((item, index) => (
              <li key={index}>
                <button
                  className={`user-menu-item ${item.className || ''}`}
                  onClick={() => {
                    item.onClick();
                    setIsOpen(false);
                  }}
                >
                  <FontAwesomeIcon icon={item.icon} className="menu-item-icon" />
                  <span className="menu-item-label">{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default UserMenu;