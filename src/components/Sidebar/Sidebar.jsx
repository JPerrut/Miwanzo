import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faHome, 
  faCog, 
  faTasks, 
  faChevronDown,
  faChevronRight,
  faUser,
  faSignOutAlt
} from '@fortawesome/free-solid-svg-icons'
import './Sidebar.css'

const Sidebar = ({ expanded, onMouseEnter, onMouseLeave }) => {
  const [activeItem, setActiveItem] = useState('Página Inicial')
  const [openMenus, setOpenMenus] = useState({})
  const location = useLocation()

  const menuItems = [
    {
      title: 'Página Inicial',
      icon: faHome,
      path: '/',
      submenu: null
    },
    {
      title: 'Área de Tarefas',
      icon: faTasks,
      submenu: [
        { title: 'Minhas Tarefas', path: '/tasks' },
        { title: 'Projetos', path: '/projects' },
        { title: 'Quadros', path: '/boards' }
      ]
    },
    {
      title: 'Configurações',
      icon: faCog,
      submenu: [
        { title: 'Perfil', path: '/settings/profile' },
        { title: 'Preferências', path: '/settings/preferences' },
        { title: 'Equipe', path: '/settings/team' }
      ]
    }
  ]

  // Atualizar item ativo baseado na rota
  useEffect(() => {
    const currentPath = location.pathname
    
    menuItems.forEach(item => {
      if (item.path === currentPath) {
        setActiveItem(item.title)
      }
      
      if (item.submenu) {
        item.submenu.forEach(subItem => {
          if (subItem.path === currentPath) {
            setActiveItem(subItem.title)
            if (!openMenus[item.title]) {
              setOpenMenus(prev => ({ ...prev, [item.title]: true }))
            }
          }
        })
      }
    })
  }, [location.pathname])

  const toggleSubmenu = (title) => {
    if (!expanded) return
    setOpenMenus(prev => ({
      ...prev,
      [title]: !prev[title]
    }))
  }

  const handleItemClick = (title) => {
    setActiveItem(title)
  }

  const handleLogout = () => {
    console.log('Logout clicked')
    // Implementar lógica de logout aqui
  }

  return (
    <nav 
      className={`sidebar ${expanded ? 'expanded' : 'collapsed'}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="sidebar-header">
        <span className={`logo ${expanded ? '' : 'collapsed-logo'}`}>
          {expanded ? 'Miwanzo' : 'M'}
        </span>
      </div>
      
      <ul className="menu-list">
        {menuItems.map((item, index) => (
          <li key={index} className="menu-item">
            {!item.submenu ? (
              <Link
                to={item.path}
                className={`menu-link ${activeItem === item.title ? 'active' : ''}`}
                onClick={() => handleItemClick(item.title)}
              >
                <FontAwesomeIcon icon={item.icon} className="menu-icon" />
                {expanded && <span className="menu-title">{item.title}</span>}
              </Link>
            ) : (
              <div>
                <div 
                  className={`menu-link has-submenu ${openMenus[item.title] ? 'submenu-open' : ''}`}
                  onClick={() => toggleSubmenu(item.title)}
                >
                  <FontAwesomeIcon icon={item.icon} className="menu-icon" />
                  {expanded && (
                    <>
                      <span className="menu-title">{item.title}</span>
                      <FontAwesomeIcon 
                        icon={openMenus[item.title] ? faChevronDown : faChevronRight} 
                        className="chevron-icon"
                      />
                    </>
                  )}
                </div>
                
                {expanded && openMenus[item.title] && (
                  <ul className="submenu">
                    {item.submenu.map((subItem, subIndex) => (
                      <li key={subIndex} className="submenu-item">
                        <Link
                          to={subItem.path}
                          className={`submenu-link ${activeItem === subItem.title ? 'active' : ''}`}
                          onClick={() => handleItemClick(subItem.title)}
                        >
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
    </nav>
  )
}

export default Sidebar