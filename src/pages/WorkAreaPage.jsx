// src/pages/WorkAreaPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/auth';
import { workAreaService } from '../services/workAreaService';
import { sectionService } from '../services/sectionService';
import { taskService } from '../services/taskService';
import './WorkAreaPage.css';

const WorkAreaPage = () => {
  const { workAreaId } = useParams();
  const navigate = useNavigate();
  const [workArea, setWorkArea] = useState(null);
  const [sections, setSections] = useState([]);
  const [tasks, setTasks] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Estados para modais
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [showEditSectionModal, setShowEditSectionModal] = useState(false);
  const [showDeleteSectionModal, setShowDeleteSectionModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [editingSection, setEditingSection] = useState(null);
  const [deletingSection, setDeletingSection] = useState(null);
  const [newTask, setNewTask] = useState({ 
    title: '', 
    description: '', 
    sectionId: '' 
  });
  const [editingTask, setEditingTask] = useState(null);
  const [editedTaskName, setEditedTaskName] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Verificar autenticação
        const authResult = await authService.verifyToken();
        if (!authResult.valid) {
          navigate('/login');
          return;
        }
        
        // Carregar área de trabalho
        const workAreaData = await workAreaService.getWorkArea(workAreaId);
        setWorkArea(workAreaData);
        
        // Carregar seções
        const sectionsData = await sectionService.getSectionsByWorkArea(workAreaId);
        setSections(sectionsData);
        
        // Carregar tarefas para cada seção
        const tasksMap = {};
        for (const section of sectionsData) {
          const sectionTasks = await taskService.getTasksBySection(section.id);
          tasksMap[section.id] = sectionTasks;
        }
        setTasks(tasksMap);
        
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        setError('Erro ao carregar a área de trabalho. Tente novamente.');
      } finally {
        setLoading(false);
      }
    };

    loadData();

    console.log('=== DEBUG sectionService ===');
    console.log('sectionService:', sectionService);
    console.log('sectionService.updateSection:', sectionService.updateSection);
    console.log('Tipo de updateSection:', typeof sectionService.updateSection);
    console.log('Métodos disponíveis:', Object.keys(sectionService));
  }, [workAreaId, navigate]);

  const handleCreateSection = async () => {
    if (!newSectionName.trim()) return;
    
    try {
      const newSection = await sectionService.createSection({
        name: newSectionName,
        work_area_id: workAreaId,
        userId: workArea.user_id
      });
      
      setSections(prev => [...prev, newSection]);
      setNewSectionName('');
      setShowSectionModal(false);
    } catch (error) {
      console.error('Erro ao criar seção:', error);
      alert('Erro ao criar seção. Tente novamente.');
    }
  };

  const handleEditSection = async () => {
    if (!newSectionName.trim() || !editingSection) return;
    
    console.log('=== INICIANDO handleEditSection ===');
    console.log('editingSection:', editingSection);
    console.log('newSectionName:', newSectionName);
    console.log('sectionService:', sectionService);
    console.log('updateSection exists?', 'updateSection' in sectionService);
    console.log('typeof updateSection:', typeof sectionService.updateSection);
    
    if (!sectionService.updateSection || typeof sectionService.updateSection !== 'function') {
      console.error('❌ sectionService.updateSection não é uma função!');
      console.error('sectionService object:', JSON.stringify(sectionService, null, 2));
      alert('Erro: sectionService.updateSection não está disponível. Verifique o console.');
      return;
    }
    
    try {
      console.log('Chamando sectionService.updateSection...');
      const updatedSection = await sectionService.updateSection(editingSection.id, {
        name: newSectionName
      });
      
      console.log('Seção atualizada com sucesso:', updatedSection);
      
      setSections(prev => prev.map(section => 
        section.id === editingSection.id ? { ...section, name: newSectionName } : section
      ));
      
      setNewSectionName('');
      setShowEditSectionModal(false);
      setEditingSection(null);
    } catch (error) {
      console.error('❌ Erro detalhado ao editar seção:', error);
      console.error('Resposta do erro:', error.response?.data);
      alert(`Erro ao editar seção: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleDeleteSection = async () => {
    if (!deletingSection) return;
    
    try {
      await sectionService.deleteSection(deletingSection.id);
      setSections(prev => prev.filter(section => section.id !== deletingSection.id));
      
      // Remover tarefas da seção do estado
      setTasks(prev => {
        const newTasks = { ...prev };
        delete newTasks[deletingSection.id];
        return newTasks;
      });
      
      setDeletingSection(null);
      setShowDeleteSectionModal(false);
    } catch (error) {
      console.error('Erro ao excluir seção:', error);
      alert('Erro ao excluir seção. Tente novamente.');
    }
  };

  const handleOpenEditModal = (section) => {
    setEditingSection(section);
    setNewSectionName(section.name);
    setShowEditSectionModal(true);
  };

  const handleOpenDeleteModal = (section) => {
    setDeletingSection(section);
    setShowDeleteSectionModal(true);
  };

  const handleCreateTask = async () => {
    if (!newTask.title.trim() || !newTask.sectionId) return;
    
    try {
      const newTaskData = await taskService.createTask({
        title: newTask.title,
        description: newTask.description,
        section_id: newTask.sectionId,
        userId: workArea.user_id
      });
      
      // Atualizar estado local
      setTasks(prev => ({
        ...prev,
        [newTask.sectionId]: [...(prev[newTask.sectionId] || []), newTaskData]
      }));
      
      // Limpar formulário
      setNewTask({ title: '', description: '', sectionId: '' });
      setShowTaskModal(false);
    } catch (error) {
      console.error('Erro ao criar tarefa:', error);
      alert('Erro ao criar tarefa. Tente novamente.');
    }
  };

  const handleToggleTask = async (task, sectionId) => {
    try {
      const newStatus = task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
      const updatedTask = await taskService.updateTask(task.id, {
        status: newStatus  // Envia status em vez de completed
      });
      
      // Atualizar estado local
      setTasks(prev => ({
        ...prev,
        [sectionId]: prev[sectionId].map(t => 
          t.id === task.id ? updatedTask : t
        )
      }));
    } catch (error) {
      console.error('Erro ao atualizar tarefa:', error);
      alert('Erro ao atualizar tarefa. Tente novamente.');
    }
  };

  const handleEditTask = async (taskId, sectionId, newTitle) => {
    if (!newTitle.trim()) return;
    
    try {
      const updatedTask = await taskService.updateTask(taskId, {
        title: newTitle.trim()
      });
      
      // Atualizar estado local
      setTasks(prev => ({
        ...prev,
        [sectionId]: prev[sectionId].map(task => 
          task.id === taskId ? { ...task, title: newTitle.trim() } : task
        )
      }));
      
      setEditingTask(null);
      setEditedTaskName('');
    } catch (error) {
      console.error('Erro ao editar tarefa:', error);
      alert('Erro ao editar tarefa. Tente novamente.');
    }
  };

  const handleDeleteTask = async (taskId, sectionId) => {
    try {
      await taskService.deleteTask(taskId);
      
      // Atualizar estado local
      setTasks(prev => ({
        ...prev,
        [sectionId]: prev[sectionId].filter(task => task.id !== taskId)
      }));
    } catch (error) {
      console.error('Erro ao excluir tarefa:', error);
      alert('Erro ao excluir tarefa. Tente novamente.');
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Carregando área de trabalho...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-message">{error}</div>
        <button 
          className="btn btn-primary" 
          onClick={() => navigate('/')}
        >
          Voltar para Home
        </button>
      </div>
    );
  }

  if (!workArea) {
    return (
      <div className="not-found-container">
        <h2>Área de trabalho não encontrada</h2>
        <button 
          className="btn btn-primary" 
          onClick={() => navigate('/')}
        >
          Voltar para Home
        </button>
      </div>
    );
  }

  return (
    <div className="work-area-container">
      {/* Cabeçalho */}
      <header className="work-area-header">
        <div className="breadcrumb">
          <Link to="/" className="breadcrumb-link">
            <i className="fas fa-home"></i> Home
          </Link>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">
            <i className="fas fa-folder"></i> {workArea.name}
          </span>
        </div>
        
        <div className="header-actions">
          <button
            className="btn btn-outline"
            onClick={() => {
              if (sections.length === 0) {
                alert('Crie uma seção primeiro antes de adicionar tarefas!');
                return;
              }
              setShowTaskModal(true);
            }}
            disabled={sections.length === 0}
          >
            <i className="fas fa-plus"></i> Nova Tarefa
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setShowSectionModal(true)}
          >
            <i className="fas fa-plus"></i> Nova Seção
          </button>
        </div>
      </header>

      <h1 className="work-area-title">{workArea.name}</h1>

      {/* Seções */}
      {sections.length === 0 ? (
        <div className="empty-state">
          <i className="fas fa-inbox fa-3x"></i>
          <h3>Nenhuma seção criada</h3>
          <p>Crie sua primeira seção para começar a adicionar tarefas!</p>
          <button
            className="btn btn-primary"
            onClick={() => setShowSectionModal(true)}
          >
            <i className="fas fa-plus"></i> Criar Primeira Seção
          </button>
        </div>
      ) : (
        <div className="sections-grid">
          {sections.map((section) => (
            <div key={section.id} className="section-card">
              {/* CABEÇALHO DA SEÇÃO COM NOME E ÍCONES */}
              <div className="section-header">
                <div className="section-title-container">
                  <h3 className="section-title">{section.name}</h3>
                </div>
                
                {/* ÍCONES DE AÇÃO - LÁPIS E X */}
                <div className="section-action-icons">
                  <button
                    className="btn-icon btn-edit"
                    onClick={() => handleOpenEditModal(section)}
                    title="Editar nome da seção"
                  >
                    <i className="fas fa-edit"></i>
                  </button>
                  <button
                    className="btn-icon btn-delete"
                    onClick={() => handleOpenDeleteModal(section)}
                    title="Excluir seção"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              </div>
              
              <div className="tasks-list">
                {(tasks[section.id] || []).map((task) => (
                  <div 
                    key={task.id} 
                    className={`task-item ${task.completed ? 'completed' : ''}`}
                  >
                    <div className="task-content">
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => handleToggleTask(task, section.id)}
                        className="task-checkbox"
                      />
                      <div className="task-info">
                        {editingTask === task.id ? (
                          <input
                            type="text"
                            value={editedTaskName}
                            onChange={(e) => setEditedTaskName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleEditTask(task.id, section.id, editedTaskName);
                              }
                              if (e.key === 'Escape') {
                                setEditingTask(null);
                                setEditedTaskName('');
                              }
                            }}
                            onBlur={() => {
                              if (editedTaskName.trim() !== task.title) {
                                handleEditTask(task.id, section.id, editedTaskName);
                              } else {
                                setEditingTask(null);
                                setEditedTaskName('');
                              }
                            }}
                            className="task-edit-input"
                            autoFocus
                          />
                        ) : (
                          <span 
                            className="task-title"
                            onDoubleClick={() => {
                              setEditingTask(task.id);
                              setEditedTaskName(task.title);
                            }}
                            title="Duplo clique para editar"
                          >
                            {task.title}
                          </span>
                        )}
                        {task.description && (
                          <span className="task-description">{task.description}</span>
                        )}
                      </div>
                    </div>
                    <button
                      className="btn-icon"
                      onClick={() => handleDeleteTask(task.id, section.id)}
                      title="Excluir tarefa"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                ))}
                
                {(!tasks[section.id] || tasks[section.id].length === 0) && (
                  <div className="empty-tasks">
                    <i className="fas fa-clipboard-list"></i>
                    <p>Nenhuma tarefa nesta seção</p>
                  </div>
                )}
              </div>
              
              <div className="section-footer">
                <button
                  className="btn btn-text"
                  onClick={() => {
                    setNewTask(prev => ({ ...prev, sectionId: section.id }));
                    setShowTaskModal(true);
                  }}
                >
                  <i className="fas fa-plus"></i> Adicionar Tarefa
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Nova Seção */}
      {showSectionModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Nova Seção</h3>
              <button 
                className="btn-icon" 
                onClick={() => setShowSectionModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="sectionName">Nome da Seção</label>
                <input
                  id="sectionName"
                  type="text"
                  value={newSectionName}
                  onChange={(e) => setNewSectionName(e.target.value)}
                  placeholder="Ex: A Fazer, Em Progresso, Concluído"
                  className="form-input"
                  autoFocus
                />
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-outline" 
                onClick={() => setShowSectionModal(false)}
              >
                Cancelar
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleCreateSection}
                disabled={!newSectionName.trim()}
              >
                Criar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Editar Seção */}
      {showEditSectionModal && editingSection && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Editar Seção</h3>
              <button 
                className="btn-icon" 
                onClick={() => {
                  setShowEditSectionModal(false);
                  setEditingSection(null);
                  setNewSectionName('');
                }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="editSectionName">Nome da Seção</label>
                <input
                  id="editSectionName"
                  type="text"
                  value={newSectionName}
                  onChange={(e) => setNewSectionName(e.target.value)}
                  placeholder="Ex: A Fazer, Em Progresso, Concluído"
                  className="form-input"
                  autoFocus
                />
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-outline" 
                onClick={() => {
                  setShowEditSectionModal(false);
                  setEditingSection(null);
                  setNewSectionName('');
                }}
              >
                Cancelar
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleEditSection}
                disabled={!newSectionName.trim()}
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação para Excluir Seção */}
      {showDeleteSectionModal && deletingSection && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Confirmar Exclusão</h3>
              <button 
                className="btn-icon" 
                onClick={() => {
                  setShowDeleteSectionModal(false);
                  setDeletingSection(null);
                }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="warning-message">
                <i className="fas fa-exclamation-triangle fa-2x"></i>
                <p>
                  Tem certeza que deseja excluir a seção 
                  <strong> "{deletingSection.name}"</strong>?
                </p>
                <p className="warning-details">
                  <i className="fas fa-info-circle"></i>
                  Todas as tarefas dentro desta seção também serão excluídas permanentemente.
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-outline" 
                onClick={() => {
                  setShowDeleteSectionModal(false);
                  setDeletingSection(null);
                }}
              >
                Cancelar
              </button>
              <button 
                className="btn btn-danger" 
                onClick={handleDeleteSection}
              >
                <i className="fas fa-trash"></i> Excluir Permanentemente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Nova Tarefa */}
      {showTaskModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Nova Tarefa</h3>
              <button 
                className="btn-icon" 
                onClick={() => setShowTaskModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="taskTitle">Título da Tarefa *</label>
                <input
                  id="taskTitle"
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="O que precisa ser feito?"
                  className="form-input"
                  autoFocus
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="taskDescription">Descrição (Opcional)</label>
                <textarea
                  id="taskDescription"
                  value={newTask.description}
                  onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Detalhes adicionais..."
                  className="form-textarea"
                  rows="3"
                />
              </div>
              
              <div className="form-group">
                <label>Seção *</label>
                <div className="section-chips">
                  {sections.map((section) => (
                    <button
                      key={section.id}
                      className={`chip ${newTask.sectionId === section.id ? 'chip-selected' : ''}`}
                      onClick={() => setNewTask(prev => ({ ...prev, sectionId: section.id }))}
                    >
                      {section.name}
                      {newTask.sectionId === section.id && (
                        <i className="fas fa-check chip-check"></i>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-outline" 
                onClick={() => setShowTaskModal(false)}
              >
                Cancelar
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleCreateTask}
                disabled={!newTask.title.trim() || !newTask.sectionId}
              >
                Criar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkAreaPage;