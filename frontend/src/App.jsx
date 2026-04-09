import React, { useEffect, useMemo, useState } from 'react';
import {
  createBrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faBars } from '@fortawesome/free-solid-svg-icons';
import Sidebar from './components/Sidebar/Sidebar';
import UserMenu from './components/UserMenu/UserMenu';
import HomePage from './pages/HomePage';
import WorkAreaPage from './pages/WorkAreaPage';
import TasksPage from './pages/TasksPage';
import SettingsPage from './pages/SettingsPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import GoogleCallbackPage from './pages/GoogleCallbackPage';
import NotFoundPage from './pages/NotFoundPage';
import { authService } from './services/auth';
import { workAreaService } from './services/workAreaService';
import './App.css';

function getPageMeta(pathname) {
  if (pathname === '/') {
    return {
      eyebrow: 'Painel principal',
      title: 'Minhas areas de trabalho',
      description: 'Gerencie espacos, secoes e tarefas com a mesma linguagem visual do seu painel central.',
    };
  }

  if (pathname.startsWith('/workarea/')) {
    return {
      eyebrow: 'Area de trabalho',
      title: 'Fluxo por secoes',
      description: 'Organize entregas em blocos claros, com foco em leitura rapida e acao direta.',
    };
  }

  if (pathname.startsWith('/tasks')) {
    return {
      eyebrow: 'Tarefas',
      title: 'Visao operacional',
      description: 'Acompanhe pendencias em colunas, com superficies limpas e contraste controlado.',
    };
  }

  if (pathname.startsWith('/settings')) {
    return {
      eyebrow: 'Preferencias',
      title: 'Configuracoes visuais',
      description: 'Ajuste modo claro, modo noturno e preferencias da interface em um unico lugar.',
    };
  }

  return {
    eyebrow: 'Miwanzo',
    title: 'Workspace',
    description: 'Ambiente unificado para organizar tarefas, secoes e configuracoes.',
  };
}

const ProtectedRoute = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const result = await authService.verifyToken();
        setIsAuthenticated(result.valid);
      } catch (_error) {
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Carregando...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return children;
};

const MainLayout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarExpanded, setSidebarExpanded] = useState(() => window.innerWidth >= 1200);
  const [sidebarPinned, setSidebarPinned] = useState(() => window.innerWidth >= 1200);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const isAuthPage =
    location.pathname === '/login' ||
    location.pathname === '/register' ||
    location.pathname === '/google-callback';

  const pageMeta = useMemo(() => getPageMeta(location.pathname), [location.pathname]);
  const desktopSidebarExpanded = sidebarPinned || sidebarExpanded;
  const isWorkAreaPage = location.pathname.startsWith('/workarea/');
  const [workAreaHeaderTitle, setWorkAreaHeaderTitle] = useState('');

  useEffect(() => {
    if (!isWorkAreaPage) {
      setWorkAreaHeaderTitle('');
      return undefined;
    }

    const match = location.pathname.match(/^\/workarea\/([^/?#]+)/);
    const workAreaId = match?.[1];
    if (!workAreaId) {
      setWorkAreaHeaderTitle('Area de trabalho');
      return undefined;
    }

    let isActive = true;

    const loadWorkAreaTitle = async () => {
      try {
        const data = await workAreaService.getWorkArea(workAreaId);
        if (!isActive) return;
        setWorkAreaHeaderTitle(data?.name || 'Area de trabalho');
      } catch (_error) {
        if (!isActive) return;
        setWorkAreaHeaderTitle('Area de trabalho');
      }
    };

    loadWorkAreaTitle();

    return () => {
      isActive = false;
    };
  }, [isWorkAreaPage, location.pathname]);

  const resolvedHeaderTitle = isWorkAreaPage
    ? workAreaHeaderTitle || 'Area de trabalho'
    : pageMeta.title;
  const resolvedHeaderDescription = isWorkAreaPage ? '' : pageMeta.description;

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 960) {
        setSidebarPinned(false);
        setSidebarExpanded(false);
      } else if (window.innerWidth >= 1200) {
        setSidebarPinned(true);
        setSidebarExpanded(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  if (isAuthPage) {
    return children;
  }

  return (
    <div className="app-shell">
      <Sidebar
        expanded={mobileSidebarOpen || desktopSidebarExpanded}
        pinned={sidebarPinned}
        mobileOpen={mobileSidebarOpen}
        onMouseEnter={() => setSidebarExpanded(true)}
        onMouseLeave={() => {
          if (!sidebarPinned) {
            setSidebarExpanded(false);
          }
        }}
        onTogglePin={() => {
          setSidebarPinned((currentValue) => {
            const nextValue = !currentValue;
            if (!nextValue) {
              setSidebarExpanded(false);
            } else {
              setSidebarExpanded(true);
            }
            return nextValue;
          });
        }}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      <main
        className={`main-content ${desktopSidebarExpanded ? 'sidebar-expanded' : 'sidebar-collapsed'} ${
          mobileSidebarOpen ? 'sidebar-mobile-open' : ''
        }`}
      >
        <header className={`main-header ${isWorkAreaPage ? 'main-header-workarea' : ''}`}>
          <div className="header-copy">
            {isWorkAreaPage ? (
              <div className="header-workarea-inline">
                <button
                  type="button"
                  className="header-back-button"
                  onClick={() => navigate('/')}
                  title="Voltar para áreas de trabalho"
                  aria-label="Voltar para áreas de trabalho"
                >
                  <FontAwesomeIcon icon={faArrowLeft} />
                  <span>Voltar</span>
                </button>
                <span className="header-eyebrow">{pageMeta.eyebrow}</span>
                <span className="header-workarea-name">{resolvedHeaderTitle}</span>
              </div>
            ) : (
              <>
                <span className="header-eyebrow">{pageMeta.eyebrow}</span>
                <div className="header-title-row">
                  <div>
                    <h1 className="header-title">{resolvedHeaderTitle}</h1>
                    {resolvedHeaderDescription ? (
                      <p className="header-description">{resolvedHeaderDescription}</p>
                    ) : null}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="header-actions">
            <button
              type="button"
              className="mobile-menu-button"
              onClick={() => setMobileSidebarOpen((currentValue) => !currentValue)}
              aria-label="Abrir menu lateral"
            >
              <FontAwesomeIcon icon={faBars} />
            </button>

            <UserMenu />
          </div>
        </header>

        <div className="page-container">{children}</div>
      </main>
    </div>
  );
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/google-callback" element={<GoogleCallbackPage />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/workarea/:workAreaId"
        element={
          <ProtectedRoute>
            <WorkAreaPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/tasks"
        element={
          <ProtectedRoute>
            <TasksPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings/profile"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

const App = () => {
  return (
    <MainLayout>
      <AppRoutes />
    </MainLayout>
  );
};

export const router = createBrowserRouter(
  [
    {
      path: '/*',
      element: <App />,
    },
  ],
  {
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true,
      v7_fetcherPersist: true,
    },
  },
);

export default App;
