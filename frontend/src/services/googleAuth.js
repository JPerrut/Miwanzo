import { authService } from './auth';

// Em vez de usar process.env, use import.meta.env no Vite
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const googleAuthService = {
  // Iniciar login com Google
  startGoogleLogin() {
    window.location.href = `${API_URL}/auth/google`;
  },

  // Processar callback URL
  async handleGoogleCallback() {
    console.log('HandleGoogleCallback chamado');
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const userParam = urlParams.get('user');

    console.log('Token encontrado:', token ? 'Sim' : 'Não');
    console.log('User param encontrado:', userParam ? 'Sim' : 'Não');

    if (token && userParam) {
      try {
        const user = JSON.parse(decodeURIComponent(userParam));
        
        // Salvar dados de autenticação
        authService.saveAuthData(token, user);
        
        console.log('Dados salvos com sucesso');
        console.log('Usuário:', user.email);
        
        // Limpar URL
        window.history.replaceState({}, document.title, '/auth/google/callback');
        
        return { success: true, user };
      } catch (error) {
        console.error('Erro ao processar callback:', error);
        return { success: false, error: 'Erro ao processar resposta do Google' };
      }
    }
    
    console.error('Nenhum token ou usuário encontrado na URL');
    return { success: false, error: 'Nenhum token encontrado na URL' };
  },

  // Verificar token com backend (opcional)
  async verifyGoogleToken(token) {
    try {
      const response = await fetch(`${API_URL}/auth/google/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();
      
      if (data.success) {
        authService.saveAuthData(data.token, data.user);
        return { success: true, user: data.user };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      return { success: false, error: 'Erro na verificação do token' };
    }
  },
};