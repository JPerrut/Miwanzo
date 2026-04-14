import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope, faLock, faShieldHalved } from '@fortawesome/free-solid-svg-icons';
import { authService } from '../services/auth';
import './AuthPages.css';

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState('request');
  const [formData, setFormData] = useState({
    email: '',
    code: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [devCode, setDevCode] = useState('');

  useEffect(() => {
    if (authService.isAuthenticated()) {
      navigate('/');
    }
  }, [navigate]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'code' ? value.replace(/\D/g, '').slice(0, 6) : value,
    }));
  };

  const handleRequestCode = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setDevCode('');
    setLoading(true);

    try {
      const response = await authService.requestPasswordReset({
        email: formData.email,
      });

      setSuccess(
        response.message || 'Se o email estiver cadastrado, o codigo foi enviado.',
      );
      setDevCode(response.devCode || '');
      setStep('confirm');
    } catch (err) {
      setError(err.response?.data?.error || 'Nao foi possivel enviar o codigo.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReset = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setDevCode('');

    if (formData.password !== formData.confirmPassword) {
      setError('As senhas nao coincidem.');
      return;
    }

    if (formData.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);

    try {
      const response = await authService.confirmPasswordReset({
        email: formData.email,
        code: formData.code,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      });

      setSuccess(response.message || 'Senha atualizada com sucesso.');
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Nao foi possivel atualizar a senha.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError('');
    setSuccess('');
    setDevCode('');
    setLoading(true);

    try {
      const response = await authService.requestPasswordReset({
        email: formData.email,
      });

      setSuccess(response.message || 'Codigo reenviado com sucesso.');
      setDevCode(response.devCode || '');
    } catch (err) {
      setError(err.response?.data?.error || 'Nao foi possivel reenviar o codigo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <h1>Recuperar senha</h1>
          <p>
            {step === 'request'
              ? 'Informe o email da conta para receber o codigo de recuperacao.'
              : 'Digite o codigo recebido por email e defina sua nova senha.'}
          </p>
        </div>

        <form className="auth-form" onSubmit={step === 'request' ? handleRequestCode : handleConfirmReset}>
          {error ? <div className="auth-error">{error}</div> : null}
          {success ? <div className="auth-success">{success}</div> : null}
          {devCode ? (
            <div className="auth-success">
              Codigo de teste em desenvolvimento: <strong>{devCode}</strong>
            </div>
          ) : null}

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
              disabled={loading || step === 'confirm'}
            />
          </div>

          {step === 'confirm' ? (
            <>
              <div className="auth-helper-row">
                <span className="auth-helper-text">
                  Codigo enviado para <strong>{formData.email}</strong>
                </span>
                <button
                  type="button"
                  className="auth-inline-link"
                  onClick={() => {
                    setStep('request');
                    setError('');
                    setSuccess('');
                    setDevCode('');
                    setFormData((prev) => ({
                      ...prev,
                      code: '',
                      password: '',
                      confirmPassword: '',
                    }));
                  }}
                  disabled={loading}
                >
                  Alterar email
                </button>
              </div>

              <div className="form-group">
                <label htmlFor="code">
                  <FontAwesomeIcon icon={faShieldHalved} />
                  Codigo
                </label>
                <input
                  type="text"
                  id="code"
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                  placeholder="000000"
                  className="auth-code-input"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">
                  <FontAwesomeIcon icon={faLock} />
                  Nova senha
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Minimo 6 caracteres"
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">
                  <FontAwesomeIcon icon={faLock} />
                  Confirmar nova senha
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
            </>
          ) : null}

          <button
            type="submit"
            className="auth-button primary"
            disabled={loading}
          >
            {loading
              ? step === 'request'
                ? 'Enviando codigo...'
                : 'Salvando nova senha...'
              : step === 'request'
                ? 'Enviar codigo'
                : 'Salvar nova senha'}
          </button>

          {step === 'confirm' ? (
            <button
              type="button"
              className="auth-button google"
              onClick={handleResendCode}
              disabled={loading}
            >
              Reenviar codigo
            </button>
          ) : null}

          <div className="auth-footer">
            <p>
              Lembrou a senha?{' '}
              <Link to="/login" className="auth-link">
                Voltar para o login
              </Link>
            </p>
          </div>
        </form>
      </div>

      <div className="auth-side">
        <div className="auth-side-content">
          <h2>Miwanzo</h2>
          <p>Mantenha o acesso da conta sob controle com recuperacao por codigo e troca rapida de senha.</p>
          <ul className="features-list">
            <li>Codigo de 6 digitos enviado por email</li>
            <li>Validade curta para reduzir risco</li>
            <li>Troca de senha em uma unica tela</li>
            <li>Sessoes antigas invalidadas apos a redefinicao</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
