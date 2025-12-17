import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope, faLock, faUser } from '@fortawesome/free-solid-svg-icons';
import { authService } from '../services/auth';
import './AuthPages.css';
import GoogleIcon from '../assets/icons/GoogleIcon';

const RegisterPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    // Se já estiver logado, redirecionar para home
    if (authService.isAuthenticated()) {
      navigate('/');
    }
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validação básica
    if (formData.password !== formData.confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    if (formData.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      const response = await authService.register({
        email: formData.email,
        username: formData.username,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      });

      if (response.success) {
        setSuccess('Conta criada com sucesso! Redirecionando...');
        authService.saveAuthData(response.token, response.user);
        
        setTimeout(() => {
          navigate('/');
        }, 1500);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao criar conta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = () => {
    // Implementar registro com Google
    console.log('Registro com Google');
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <h1>Crie sua conta</h1>
          <p>Comece a gerenciar suas tarefas hoje mesmo</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          {success && (
            <div className="auth-success">
              {success}
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
            <label htmlFor="username">
              <FontAwesomeIcon icon={faUser} />
              Nome de usuário
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="nomeusuario"
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
              placeholder="Mínimo 6 caracteres"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">
              <FontAwesomeIcon icon={faLock} />
              Confirmar senha
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Digite a senha novamente"
              required
              disabled={loading}
            />
          </div>

          <button 
            type="submit" 
            className="auth-button primary"
            disabled={loading}
          >
            {loading ? 'Criando conta...' : 'Criar conta'}
          </button>

          <div className="divider">
            <span>ou</span>
          </div>

          <button
            type="button"
            className="auth-button google"
            onClick={handleGoogleRegister}
            disabled={loading}
          >
            <GoogleIcon />
            <span>Continuar com Google</span>
          </button>

          <div className="auth-footer">
            <p>
              Já tem uma conta?{' '}
              <Link to="/login" className="auth-link">
                Faça login
              </Link>
            </p>
          </div>
        </form>
      </div>

      <div className="auth-side">
        <div className="auth-side-content">
          <h2>Miwanzo</h2>
          <p>Organize, priorize e execute suas tarefas de forma eficiente</p>
          <ul className="features-list">
            <li>✅ Gerenciamento de projetos</li>
            <li>✅ Colaboração em equipe</li>
            <li>✅ Personalização completa</li>
            <li>✅ Acesso de qualquer dispositivo</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;