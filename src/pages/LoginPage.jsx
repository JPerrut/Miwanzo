import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope, faLock, faGoogle } from '@fortawesome/free-solid-svg-icons';
import { authService } from '../services/auth';
import './AuthPages.css';

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Se já estiver logado, redirecionar para home
    if (authService.isAuthenticated()) {
      navigate('/');
    }
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authService.login({
        email: formData.email,
        password: formData.password,
        rememberMe: formData.rememberMe,
      });

      if (response.success) {
        authService.saveAuthData(response.token, response.user);
        
        // Redirecionar para a página que tentou acessar ou home
        const from = location.state?.from?.pathname || '/';
        navigate(from, { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao fazer login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // Implementar login com Google
    console.log('Login com Google');
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <h1>Bem-vindo de volta!</h1>
          <p>Faça login para acessar sua conta</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">
              <FontAwesomeIcon icon={faEnvelope} />
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="seu@email.com"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">
              <FontAwesomeIcon icon={faLock} />
              Senha
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Sua senha"
              required
              disabled={loading}
            />
          </div>

          <div className="form-options">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="rememberMe"
                checked={formData.rememberMe}
                onChange={handleChange}
                disabled={loading}
              />
              <span>Manter-me logado</span>
            </label>
            <Link to="/forgot-password" className="forgot-password">
              Esqueceu a senha?
            </Link>
          </div>

          <button 
            type="submit" 
            className="auth-button primary"
            disabled={loading}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>

          <div className="divider">
            <span>ou</span>
          </div>

          <button
            type="button"
            className="auth-button google"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            <FontAwesomeIcon icon={faGoogle} />
            <span>Continuar com Google</span>
          </button>

          <div className="auth-footer">
            <p>
              Não tem uma conta?{' '}
              <Link to="/register" className="auth-link">
                Cadastre-se
              </Link>
            </p>
          </div>
        </form>
      </div>

      <div className="auth-side">
        <div className="auth-side-content">
          <h2>Miwanzo</h2>
          <p>Gerencie suas tarefas de forma simples e eficiente</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;