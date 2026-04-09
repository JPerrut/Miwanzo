import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChevronDown,
  faRightFromBracket,
  faUser,
  faUserCircle,
} from '@fortawesome/free-solid-svg-icons';
import { authService } from '../../services/auth';
import './UserMenu.css';

const UserMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState(null);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const authData = authService.getAuthData();
    if (authData.user) {
      setUser(authData.user);
    }

    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayName = useMemo(() => {
    if (!user) {
      return '';
    }

    return user.full_name || user.name || user.username || 'Usuario';
  }, [user]);

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    } finally {
      authService.clearAuthData();
      navigate('/login');
    }
  };

  const menuItems = [
    {
      label: 'Meu perfil',
      icon: faUser,
      onClick: () => navigate('/settings/profile'),
    },
    {
      label: 'Sair',
      icon: faRightFromBracket,
      onClick: handleLogout,
      className: 'logout-item',
    },
  ];

  if (!user) {
    return null;
  }

  return (
    <div className="user-menu-container" ref={menuRef}>
      <button
        type="button"
        className="user-menu-button"
        onClick={() => setIsOpen((currentValue) => !currentValue)}
        aria-expanded={isOpen}
        aria-label="Menu do usuario"
      >
        <div className="user-avatar">
          {user.avatar_url ? <img src={user.avatar_url} alt={displayName} /> : <FontAwesomeIcon icon={faUserCircle} />}
        </div>
        <div className="user-button-copy">
          <span className="user-name">{displayName}</span>
          <span className="user-role">{user.email}</span>
        </div>
        <FontAwesomeIcon icon={faChevronDown} className={`chevron ${isOpen ? 'open' : ''}`} />
      </button>

      {isOpen && (
        <div className="user-menu-dropdown">
          <div className="user-info-card">
            <div className="user-info-avatar">
              {user.avatar_url ? <img src={user.avatar_url} alt={displayName} /> : <FontAwesomeIcon icon={faUserCircle} />}
            </div>
            <div className="user-info-details">
              <h4 className="user-info-name">{displayName}</h4>
              <p className="user-info-email">{user.email}</p>
            </div>
          </div>

          <div className="user-menu-divider"></div>

          <ul className="user-menu-items">
            {menuItems.map((item) => (
              <li key={item.label}>
                <button
                  type="button"
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
