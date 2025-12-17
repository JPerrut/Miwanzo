import React, { useState, useEffect } from 'react';
import { 
  createBrowserRouter,
  RouterProvider,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation 
} from 'react-router-dom';
import Sidebar from './components/Sidebar/Sidebar';
import UserMenu from './components/UserMenu/UserMenu';
import HomePage from './pages/HomePage';
import TasksPage from './pages/TasksPage';
import SettingsPage from './pages/SettingsPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import GoogleCallbackPage from './pages/GoogleCallbackPage';
import NotFoundPage from './pages/NotFoundPage';
import { authService } from './services/auth';
import './App.css';

// Componente para rotas protegidas
const ProtectedRoute = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const result = await authService.verifyToken();
        setIsAuthenticated(result.valid);
      } catch (error) {
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

// Layout principal com sidebar
const MainLayout = ({ children }) => {
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const location = useLocation();

  const handleSidebarMouseEnter = () => {
    setSidebarExpanded(true);
  };

  const handleSidebarMouseLeave = () => {
    setSidebarExpanded(false);
  };

  // Não mostrar sidebar em páginas de login/register
  if (location.pathname === '/login' || 
      location.pathname === '/register' ||
      location.pathname === '/google-callback') {
    return children;
  }

  return (
    <div className="app">
      <Sidebar 
        expanded={sidebarExpanded}
        onMouseEnter={handleSidebarMouseEnter}
        onMouseLeave={handleSidebarMouseLeave}
      />
      
      <main className={`main-content ${sidebarExpanded ? 'sidebar-expanded' : 'sidebar-collapsed'}`}>
        <header className="main-header">
          <div className="header-left">
          </div>
          <div className="header-right">
            <UserMenu />
          </div>
        </header>
        
        <div className="page-container">
          {children}
        </div>
      </main>
    </div>
  );
};

// Componente principal que usa as rotas
const AppRoutes = () => {
  return (
    <Routes>
      {/* Rotas públicas */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/google-callback" element={<GoogleCallbackPage />} />
      
      {/* Rotas protegidas */}
      <Route path="/" element={
        <ProtectedRoute>
          <HomePage />
        </ProtectedRoute>
      } />
      
      <Route path="/tasks" element={
        <ProtectedRoute>
          <TasksPage />
        </ProtectedRoute>
      } />
      
      <Route path="/settings" element={
        <ProtectedRoute>
          <SettingsPage />
        </ProtectedRoute>
      } />
      
      <Route path="/settings/profile" element={
        <ProtectedRoute>
          <SettingsPage />
        </ProtectedRoute>
      } />
      
      {/* Rota 404 */}
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

export const router = createBrowserRouter([
  {
    path: '/*',
    element: <App />,
  }
], {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
    v7_fetcherPersist: true,
  }
});

export default App;