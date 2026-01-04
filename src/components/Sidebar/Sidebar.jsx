import React, { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faHome, 
  faCog, 
  faTasks, 
  faChevronDown,
  faChevronRight,
  faUser,
  faSignOutAlt,
  faFolder,
  faBriefcase
} from '@fortawesome/free-solid-svg-icons'
import { workAreaService } from '../../services/workAreaService'
import './Sidebar.css'

const Sidebar = ({ expanded, onMouseEnter, onMouseLeave }) => {
  const [activeItem, setActiveItem] = useState('Página Inicial')
  const [openMenus, setOpenMenus] = useState({})
  const [workAreas, setWorkAreas] = useState([])
  const [loadingWorkAreas, setLoadingWorkAreas] = useState(true)
  const location = useLocation()
  const navigate = useNavigate()

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

  // Carregar áreas de trabalho do usuário
  useEffect(() => {
    const loadWorkAreas = async () => {
      try {
        setLoadingWorkAreas(true)
        const areas = await workAreaService.getWorkAreas()
        setWorkAreas(areas)
      } catch (error) {
        console.error('Erro ao carregar áreas de trabalho:', error)
      } finally {
        setLoadingWorkAreas(false)
      }
    }

    loadWorkAreas()
  }, [])

  // Atualizar item ativo baseado na rota
  useEffect(() => {
    const currentPath = location.pathname
    
    // Verificar rotas padrão
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

    // Verificar se está em uma área de trabalho (/workarea/:id)
    if (currentPath.startsWith('/workarea/')) {
      const workAreaId = currentPath.split('/workarea/')[1]
      const workArea = workAreas.find(area => area.id === workAreaId)
      if (workArea) {
        setActiveItem(`workarea-${workAreaId}`)
      }
    }
  }, [location.pathname, workAreas])

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

  const handleWorkAreaClick = (workAreaId, workAreaName) => {
    setActiveItem(`workarea-${workAreaId}`)
    navigate(`/workarea/${workAreaId}`)
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

        {/* Seção de Áreas de Trabalho */}
        {expanded && (
          <div className="work-areas-section">
            <div className="work-areas-header">
              <FontAwesomeIcon icon={faBriefcase} className="work-areas-icon" />
              <span className="work-areas-title">Áreas de Trabalho</span>
            </div>
            <div className="work-areas-divider"></div>
            
            {loadingWorkAreas ? (
              <div className="work-areas-loading">
                <span>Carregando...</span>
              </div>
            ) : workAreas.length === 0 ? (
              <div className="no-work-areas">
                <FontAwesomeIcon icon={faFolder} />
                <span>Nenhuma área criada</span>
              </div>
            ) : (
              <ul className="work-areas-list">
                {workAreas.map((workArea) => {
                  console.log('Work Area Data:', workArea);
                  
                  // Verifique se o objeto tem a estrutura correta
                  const workAreaName = workArea.name || workArea.nome || workArea.title || 'Sem nome';
                  const workAreaId = workArea.id || workArea._id || workArea.code;
                  
                  return (
                    <li key={workAreaId} className="work-area-item">
                      <button
                        className={`work-area-link ${activeItem === `workarea-${workAreaId}` ? 'active' : ''}`}
                        onClick={() => handleWorkAreaClick(workAreaId, workAreaName)}
                        title={workAreaName}
                      >
                        <FontAwesomeIcon icon={faFolder} className="work-area-icon" />
                        <span className="work-area-name" style={{ color: "rgba(255, 255, 255, 0.7)" }}>{workAreaName}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {/* Versão recolhida das áreas de trabalho */}
        {!expanded && workAreas.length > 0 && (
          <li className="menu-item">
            <div className="collapsed-work-areas">
              <FontAwesomeIcon 
                icon={faBriefcase} 
                className="menu-icon"
                title="Áreas de Trabalho"
              />
            </div>
          </li>
        )}
      </ul>
    </nav>
  )
}

export default Sidebar