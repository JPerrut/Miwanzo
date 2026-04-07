import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBriefcase,
  faChevronDown,
  faChevronRight,
  faCog,
  faFolder,
  faHouse,
  faListCheck,
  faThumbtack,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { workAreaService } from '../../services/workAreaService';
import './Sidebar.css';

const baseMenuItems = [
  {
    title: 'Pagina inicial',
    icon: faHouse,
    path: '/',
    submenu: null,
  },
  {
    title: 'Area de tarefas',
    icon: faListCheck,
    path: '/tasks',
    submenu: null,
  },
  {
    title: 'Configuracoes',
    icon: faCog,
    submenu: [
      { title: 'Perfil', path: '/settings/profile' },
      { title: 'Preferencias', path: '/settings' },
    ],
  },
];

const Sidebar = ({
  expanded,
  pinned,
  mobileOpen,
  onMouseEnter,
  onMouseLeave,
  onTogglePin,
  onCloseMobile,
}) => {
  const [activeItem, setActiveItem] = useState('Pagina inicial');
  const [openMenus, setOpenMenus] = useState({});
  const [workAreas, setWorkAreas] = useState([]);
  const [loadingWorkAreas, setLoadingWorkAreas] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = useMemo(() => baseMenuItems, []);

  useEffect(() => {
    const loadWorkAreas = async () => {
      const token = localStorage.getItem('token');

      if (!token) {
        setWorkAreas([]);
        setLoadingWorkAreas(false);
        return;
      }

      try {
        setLoadingWorkAreas(true);
        const areas = await workAreaService.getWorkAreas();
        setWorkAreas(areas);
      } catch (error) {
        console.error('Erro ao carregar areas de trabalho:', error);
      } finally {
        setLoadingWorkAreas(false);
      }
    };

    loadWorkAreas();
  }, []);

  useEffect(() => {
    const currentPath = location.pathname;

    menuItems.forEach((item) => {
      if (item.path === currentPath) {
        setActiveItem(item.title);
      }

      if (item.submenu) {
        item.submenu.forEach((subItem) => {
          if (subItem.path === currentPath) {
            setActiveItem(subItem.title);
            setOpenMenus((currentOpenMenus) => ({
              ...currentOpenMenus,
              [item.title]: true,
            }));
          }
        });
      }
    });

    if (currentPath.startsWith('/workarea/')) {
      const workAreaId = currentPath.split('/workarea/')[1];
      const workArea = workAreas.find((area) => area.id === workAreaId);
      if (workArea) {
        setActiveItem(`workarea-${workAreaId}`);
      }
    }
  }, [location.pathname, menuItems, workAreas]);

  const toggleSubmenu = (title) => {
    if (!expanded) {
      return;
    }

    setOpenMenus((currentOpenMenus) => ({
      ...currentOpenMenus,
      [title]: !currentOpenMenus[title],
    }));
  };

  const handleItemClick = (title) => {
    setActiveItem(title);
    onCloseMobile?.();
  };

  const handleWorkAreaClick = (workAreaId) => {
    setActiveItem(`workarea-${workAreaId}`);
    navigate(`/workarea/${workAreaId}`);
    onCloseMobile?.();
  };

  const isMenuActive = (item) => {
    if (activeItem === item.title) {
      return true;
    }

    return item.submenu?.some((subItem) => subItem.title === activeItem);
  };

  return (
    <>
      <div className={`sidebar-backdrop ${mobileOpen ? 'visible' : ''}`} onClick={onCloseMobile}></div>

      <aside
        className={`sidebar ${expanded ? 'expanded' : 'collapsed'} ${mobileOpen ? 'mobile-open' : ''}`}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <div className="sidebar-frame">
          <div className="sidebar-header">
            <div className="brand-block">
              <span className="brand-mark">{expanded ? 'M' : 'M'}</span>
              {expanded && (
                <div className="brand-copy">
                  <strong>Miwanzo</strong>
                  <span>Workspace visual</span>
                </div>
              )}
            </div>

            <div className="sidebar-header-actions">
              {expanded && (
                <button
                  type="button"
                  className={`sidebar-pin-button ${pinned ? 'active' : ''}`}
                  onClick={onTogglePin}
                  title={pinned ? 'Desfixar menu' : 'Fixar menu'}
                >
                  <FontAwesomeIcon icon={faThumbtack} />
                </button>
              )}

              <button type="button" className="sidebar-close-button" onClick={onCloseMobile} title="Fechar menu">
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>
          </div>

          <nav className="sidebar-nav">
            <div className="menu-section">
              <span className={`menu-caption ${expanded ? 'visible' : ''}`}>Navegacao</span>
              <ul className="menu-list">
                {menuItems.map((item) => (
                  <li key={item.title} className="menu-item">
                    {!item.submenu ? (
                      <Link
                        to={item.path}
                        className={`menu-link ${isMenuActive(item) ? 'active' : ''}`}
                        onClick={() => handleItemClick(item.title)}
                      >
                        <FontAwesomeIcon icon={item.icon} className="menu-icon" />
                        {expanded && <span className="menu-title">{item.title}</span>}
                      </Link>
                    ) : (
                      <div className="menu-group">
                        <button
                          type="button"
                          className={`menu-link menu-toggle ${isMenuActive(item) ? 'active' : ''}`}
                          onClick={() => toggleSubmenu(item.title)}
                        >
                          <span className="menu-leading">
                            <FontAwesomeIcon icon={item.icon} className="menu-icon" />
                            {expanded && <span className="menu-title">{item.title}</span>}
                          </span>
                          {expanded && (
                            <FontAwesomeIcon
                              icon={openMenus[item.title] ? faChevronDown : faChevronRight}
                              className="chevron-icon"
                            />
                          )}
                        </button>

                        {expanded && openMenus[item.title] && (
                          <ul className="submenu">
                            {item.submenu.map((subItem) => (
                              <li key={subItem.title} className="submenu-item">
                                <Link
                                  to={subItem.path}
                                  className={`submenu-link ${activeItem === subItem.title ? 'active' : ''}`}
                                  onClick={() => handleItemClick(subItem.title)}
                                >
                                  <span className="submenu-bullet"></span>
                                  <span className="submenu-title">{subItem.title}</span>
                                </Link>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div className="work-areas-section">
              {expanded && (
                <div className="work-areas-header">
                  <div>
                    <span className="menu-caption visible">Areas de trabalho</span>
                    <p className="work-areas-help">Acesso rapido aos seus espacos ativos.</p>
                  </div>
                  <FontAwesomeIcon icon={faBriefcase} className="work-areas-header-icon" />
                </div>
              )}

              {loadingWorkAreas ? (
                <div className="work-areas-loading">
                  {expanded ? <span>Carregando...</span> : <span className="dot-loader"></span>}
                </div>
              ) : workAreas.length === 0 ? (
                <div className="no-work-areas">
                  <FontAwesomeIcon icon={faFolder} />
                  {expanded && <span>Nenhuma area criada</span>}
                </div>
              ) : (
                <ul className="work-areas-list">
                  {workAreas.map((workArea) => {
                    const workAreaName = workArea.name || workArea.nome || workArea.title || 'Sem nome';
                    const workAreaId = workArea.id || workArea._id || workArea.code;

                    return (
                      <li key={workAreaId} className="work-area-item">
                        <button
                          type="button"
                          className={`work-area-link ${activeItem === `workarea-${workAreaId}` ? 'active' : ''}`}
                          onClick={() => handleWorkAreaClick(workAreaId)}
                          title={workAreaName}
                        >
                          <FontAwesomeIcon icon={faFolder} className="work-area-icon" />
                          {expanded && <span className="work-area-name">{workAreaName}</span>}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </nav>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
