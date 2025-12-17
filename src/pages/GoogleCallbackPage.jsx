import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { googleAuthService } from '../services/googleAuth';
import './GoogleCallbackPage.css';

const GoogleCallbackPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const processCallback = async () => {
      const result = await googleAuthService.handleGoogleCallback();
      
      if (result.success) {
        navigate('/');
      } else {
        navigate('/login', { state: { error: result.error } });
      }
    };

    processCallback();
  }, [navigate]);

  return (
    <div className="loading-container">
      <div className="loading-spinner"></div>
      <p>Processando login com Google...</p>
    </div>
  );
};

export default GoogleCallbackPage;