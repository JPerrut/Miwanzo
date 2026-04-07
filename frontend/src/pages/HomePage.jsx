import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth';
import { workAreaService } from '../services/workAreaService';
import './HomePage.css';

const HomePage = () => {
  const navigate = useNavigate();
  const [workAreas, setWorkAreas] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newWorkAreaName, setNewWorkAreaName] = useState('');
  const [deletingWorkArea, setDeletingWorkArea] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [inlineEditingId, setInlineEditingId] = useState(null);
  const [inlineEditingName, setInlineEditingName] = useState('');

  const formatDate = (dateString) => {
    if (!dateString || dateString === 'Invalid Date') {
      return 'Data nao disponivel';
    }

    try {
      const date = new Date(dateString);

      if (Number.isNaN(date.getTime())) {
        return 'Data invalida';
      }

      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch (error) {
      console.error('Erro ao formatar data:', dateString, error);
      return 'Data invalida';
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const authResult = await authService.verifyToken();
        if (!authResult.valid) {
          window.location.href = '/login';
          return;
        }

        setUser(authResult.user);
        const areas = await workAreaService.getWorkAreas();
        setWorkAreas(areas);
      } catch (error) {
        console.error('Erro ao carregar areas de trabalho:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleCreateWorkArea = async () => {
    if (!newWorkAreaName.trim() || !user) return;

    try {
      const newWorkArea = await workAreaService.createWorkArea({
        name: newWorkAreaName,
        userId: user.id,
      });

      if (!newWorkArea.created_at) {
        newWorkArea.created_at = new Date().toISOString();
      }
      newWorkArea.section_count = 0;
      newWorkArea.task_count = 0;

      setWorkAreas((prev) => [...prev, newWorkArea]);
      setNewWorkAreaName('');
      setShowModal(false);
    } catch (error) {
      console.error('Erro ao criar area de trabalho:', error);
      alert('Erro ao criar area de trabalho. Tente novamente.');
    }
  };

  const handleDeleteWorkArea = async () => {
    if (!deletingWorkArea) return;

    try {
      await workAreaService.deleteWorkArea(deletingWorkArea.id);
      setWorkAreas((prev) => prev.filter((area) => area.id !== deletingWorkArea.id));
      setDeletingWorkArea(null);
    } catch (error) {
      console.error('Erro ao excluir area de trabalho:', error);
      alert('Erro ao excluir area de trabalho. Tente novamente.');
    }
  };

  const handleSaveInlineWorkArea = async (workArea) => {
    const trimmed = inlineEditingName.trim();
    if (!trimmed || trimmed === workArea.name) {
      setInlineEditingId(null);
      setInlineEditingName('');
      return;
    }

    try {
      const updatedArea = await workAreaService.updateWorkArea(workArea.id, {
        name: trimmed,
      });

      updatedArea.created_at = workArea.created_at || updatedArea.created_at;
      updatedArea.section_count = workArea.section_count ?? 0;
      updatedArea.task_count = workArea.task_count ?? 0;

      setWorkAreas((prev) =>
        prev.map((area) => (area.id === workArea.id ? updatedArea : area)),
      );
      setInlineEditingId(null);
      setInlineEditingName('');
    } catch (error) {
      console.error('Erro ao atualizar area de trabalho:', error);
      alert('Erro ao atualizar area de trabalho. Tente novamente.');
    }
  };

  const handleOpenDeleteModal = (workArea) => {
    setDeletingWorkArea(workArea);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setNewWorkAreaName('');
  };

  const handleCloseDeleteModal = () => {
    setDeletingWorkArea(null);
  };

  const handleSubmitFromInput = (event) => {
    if (event.key !== 'Enter') return;
    handleCreateWorkArea();
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Carregando suas areas de trabalho...</p>
      </div>
    );
  }

  return (
    <div className="home-container">
      {workAreas.length === 0 ? (
        <div className="empty-state">
          <i className="fas fa-folder-open fa-3x"></i>
          <h3>Voce ainda nao tem areas de trabalho</h3>
          <p>Clique em "Nova Area de Trabalho" para criar a primeira.</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowModal(true)}
          >
            <i className="fas fa-plus"></i> Criar Primeira Area
          </button>
        </div>
      ) : (
        <div className="work-areas-grid">
          {workAreas.map((workArea) => (
            <div
              key={workArea.id}
              className="work-area-card"
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/workarea/${workArea.id}`)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  navigate(`/workarea/${workArea.id}`);
                }
              }}
            >
              <div className="work-area-card-header">
                <div
                  className="work-area-title-container"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (inlineEditingId === workArea.id) return;
                    setInlineEditingId(workArea.id);
                    setInlineEditingName(workArea.name);
                  }}
                  title="Clique para editar nome"
                >
                  <i className="fas fa-folder work-area-icon"></i>
                  {inlineEditingId === workArea.id ? (
                    <input
                      type="text"
                      className="work-area-name-input"
                      value={inlineEditingName}
                      autoFocus
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) => setInlineEditingName(event.target.value)}
                      onBlur={() => handleSaveInlineWorkArea(workArea)}
                      onKeyDown={(event) => {
                        event.stopPropagation();
                        if (event.key === 'Enter') handleSaveInlineWorkArea(workArea);
                        if (event.key === 'Escape') {
                          setInlineEditingId(null);
                          setInlineEditingName('');
                        }
                      }}
                    />
                  ) : (
                    <h3 className="work-area-name">{workArea.name}</h3>
                  )}
                </div>

                <div className="work-area-action-icons">
                  <button
                    type="button"
                    className="btn-icon btn-delete"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleOpenDeleteModal(workArea);
                    }}
                    title="Excluir area de trabalho"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              </div>

              <div className="work-area-info">
                <div className="info-item">
                  <i className="fas fa-calendar"></i>
                  <span>Criada em: {formatDate(workArea.created_at)}</span>
                </div>
                <div className="info-item">
                  <i className="fas fa-layer-group"></i>
                  <span>Topicos: {workArea.section_count ?? 0}</span>
                </div>
                <div className="info-item">
                  <i className="fas fa-list-check"></i>
                  <span>Total Tarefas: {workArea.task_count ?? 0}</span>
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            className="work-area-card work-area-card-create"
            onClick={() => setShowModal(true)}
          >
            <span className="create-card-icon">
              <i className="fas fa-plus"></i>
            </span>
            <strong>Criar nova area</strong>
            <span>Adicione mais um espaco ao seu painel.</span>
          </button>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Nova Area de Trabalho</h3>
              <button type="button" className="btn-icon" onClick={handleCloseModal}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="workAreaName">Nome da Area de Trabalho</label>
                <input
                  id="workAreaName"
                  type="text"
                  value={newWorkAreaName}
                  onChange={(event) => setNewWorkAreaName(event.target.value)}
                  placeholder="Ex: Trabalho, Estudos, Pessoal"
                  className="form-input"
                  autoFocus
                  onKeyDown={handleSubmitFromInput}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={handleCloseModal}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleCreateWorkArea}
                disabled={!newWorkAreaName.trim()}
              >
                Criar
              </button>
            </div>
          </div>
        </div>
      )}

      {deletingWorkArea && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Confirmar Exclusao</h3>
              <button type="button" className="btn-icon" onClick={handleCloseDeleteModal}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="warning-message">
                <i className="fas fa-exclamation-triangle fa-2x"></i>
                <p>
                  Tem certeza que deseja excluir a area de trabalho
                  <strong> "{deletingWorkArea.name}"</strong>?
                </p>
                <p className="warning-details">
                  <i className="fas fa-info-circle"></i>
                  Todas as secoes e tarefas dentro desta area tambem serao excluidas
                  permanentemente.
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={handleCloseDeleteModal}>
                Cancelar
              </button>
              <button type="button" className="btn btn-danger" onClick={handleDeleteWorkArea}>
                <i className="fas fa-trash"></i>{' '}
                <span className="btn-danger-text">Excluir Permanentemente</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;
