// src/pages/HomePage.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../services/auth';
import { workAreaService } from '../services/workAreaService';
import './HomePage.css';

const HomePage = () => {
  const [workAreas, setWorkAreas] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newWorkAreaName, setNewWorkAreaName] = useState('');
  const [editingWorkArea, setEditingWorkArea] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  // Função para formatar data com fallback
  const formatDate = (dateString) => {
    if (!dateString || dateString === 'Invalid Date') {
      return 'Data não disponível';
    }
    
    try {
      const date = new Date(dateString);
      
      // Verifica se a data é válida
      if (isNaN(date.getTime())) {
        return 'Data inválida';
      }
      
      // Sempre formata, não faz verificação de "Agora mesmo"
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch (error) {
      console.error('Erro ao formatar data:', dateString, error);
      return 'Data inválida';
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        // Verificar autenticação
        const authResult = await authService.verifyToken();
        if (!authResult.valid) {
          window.location.href = '/login';
          return;
        }
        
        setUser(authResult.user);
        
        // Carregar áreas de trabalho
        const areas = await workAreaService.getWorkAreas();
        setWorkAreas(areas);
      } catch (error) {
        console.error('Erro ao carregar áreas de trabalho:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleCreateWorkArea = async () => {
    if (!newWorkAreaName.trim()) return;
    
    try {
      const newWorkArea = await workAreaService.createWorkArea({
        name: newWorkAreaName,
        userId: user.id
      });
      
      // Adiciona timestamp local se o backend não retornou
      if (!newWorkArea.created_at) {
        newWorkArea.created_at = new Date().toISOString();
      }
      
      setWorkAreas(prev => [...prev, newWorkArea]);
      setNewWorkAreaName('');
      setShowModal(false);
      setEditingWorkArea(null);
    } catch (error) {
      console.error('Erro ao criar área de trabalho:', error);
      alert('Erro ao criar área de trabalho. Tente novamente.');
    }
  };

  const handleDeleteWorkArea = async (workAreaId) => {
    if (!window.confirm('Tem certeza que deseja excluir esta área de trabalho? Todas as tarefas serão removidas.')) {
      return;
    }

    try {
      await workAreaService.deleteWorkArea(workAreaId);
      setWorkAreas(prev => prev.filter(area => area.id !== workAreaId));
    } catch (error) {
      console.error('Erro ao excluir área de trabalho:', error);
      alert('Erro ao excluir área de trabalho. Tente novamente.');
    }
  };

  const handleEditWorkArea = async () => {
    if (!newWorkAreaName.trim() || !editingWorkArea) return;
    
    try {
      const updatedArea = await workAreaService.updateWorkArea(editingWorkArea.id, {
        name: newWorkAreaName
      });
      
      // Mantém a data de criação original
      updatedArea.created_at = editingWorkArea.created_at || updatedArea.created_at;
      
      setWorkAreas(prev => prev.map(area => 
        area.id === editingWorkArea.id ? updatedArea : area
      ));
      
      setNewWorkAreaName('');
      setShowModal(false);
      setEditingWorkArea(null);
    } catch (error) {
      console.error('Erro ao atualizar área de trabalho:', error);
      alert('Erro ao atualizar área de trabalho. Tente novamente.');
    }
  };

  const handleOpenEditModal = (workArea) => {
    setEditingWorkArea(workArea);
    setNewWorkAreaName(workArea.name);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setNewWorkAreaName('');
    setEditingWorkArea(null);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Carregando suas áreas de trabalho...</p>
      </div>
    );
  }

  return (
    <div className="home-container">
      <div className="home-header">
        <h1 className="home-title">Minhas Áreas de Trabalho</h1>
        <button
          className="btn btn-primary"
          onClick={() => setShowModal(true)}
        >
          <i className="fas fa-plus"></i> Nova Área de Trabalho
        </button>
      </div>

      {workAreas.length === 0 ? (
        <div className="empty-state">
          <i className="fas fa-folder-open fa-3x"></i>
          <h3>Você ainda não tem áreas de trabalho</h3>
          <p>Clique em "Nova Área de Trabalho" para criar a primeira!</p>
          <button
            className="btn btn-primary"
            onClick={() => setShowModal(true)}
          >
            <i className="fas fa-plus"></i> Criar Primeira Área
          </button>
        </div>
      ) : (
        <div className="work-areas-grid">
          {workAreas.map((workArea) => (
            <div key={workArea.id} className="work-area-card">
              <div className="work-area-card-header">
                <i className="fas fa-folder work-area-icon"></i>
                <h3 className="work-area-name">{workArea.name}</h3>
              </div>
              
              <div className="work-area-info">
                <div className="info-item">
                  <i className="fas fa-calendar"></i>
                  <span>Criada em: {formatDate(workArea.created_at)}</span> {/* CORRIGIDO */}
                </div>
                {workArea.section_count !== undefined && (
                  <div className="info-item">
                    <i className="fas fa-layer-group"></i>
                    <span>Seções: {workArea.section_count}</span>
                  </div>
                )}
                {workArea.color && (
                  <div className="info-item">
                    <i className="fas fa-palette"></i>
                    <span>
                      Total Tarefas: 
                      <span 
                        className="color-dot" 
                        style={{ backgroundColor: workArea.color }}
                      ></span>
                    </span>
                  </div>
                )}
              </div>
              
              <div className="work-area-actions">
                <div className="action-buttons">
                  <button
                    className="btn-icon"
                    onClick={() => handleOpenEditModal(workArea)}
                    title="Editar nome"
                  >
                    <i className="fas fa-edit"></i>
                  </button>
                  <button
                    className="btn-icon btn-danger"
                    onClick={() => handleDeleteWorkArea(workArea.id)}
                    title="Excluir"
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
                <Link 
                  to={`/workarea/${workArea.id}`}
                  className="btn btn-outline"
                >
                  <i className="fas fa-folder-open"></i> Abrir
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal para criar/editar área de trabalho */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>{editingWorkArea ? 'Editar Área de Trabalho' : 'Nova Área de Trabalho'}</h3>
              <button 
                className="btn-icon" 
                onClick={handleCloseModal}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="workAreaName">Nome da Área de Trabalho</label>
                <input
                  id="workAreaName"
                  type="text"
                  value={newWorkAreaName}
                  onChange={(e) => setNewWorkAreaName(e.target.value)}
                  placeholder="Ex: Trabalho, Estudos, Pessoal"
                  className="form-input"
                  autoFocus
                  onKeyPress={(e) => e.key === 'Enter' && (editingWorkArea ? handleEditWorkArea() : handleCreateWorkArea())}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-outline" 
                onClick={handleCloseModal}
              >
                Cancelar
              </button>
              <button 
                className="btn btn-primary" 
                onClick={editingWorkArea ? handleEditWorkArea : handleCreateWorkArea}
                disabled={!newWorkAreaName.trim()}
              >
                {editingWorkArea ? 'Salvar' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;