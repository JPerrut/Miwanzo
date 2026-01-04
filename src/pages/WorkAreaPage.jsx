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
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [newTask, setNewTask] = useState({ 
    title: '', 
    description: '', 
    sectionId: '' 
  });

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
  }, [workAreaId, navigate]);

  const handleCreateSection = async () => {
    if (!newSectionName.trim()) return;
    
    try {
      const newSection = await sectionService.createSection({
        name: newSectionName,
        workAreaId,
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

  const handleDeleteSection = async (sectionId) => {
    if (!window.confirm('Tem certeza que deseja excluir esta seção? Todas as tarefas serão removidas.')) {
      return;
    }

    try {
      await sectionService.deleteSection(sectionId);
      setSections(prev => prev.filter(section => section.id !== sectionId));
      
      // Remover tarefas da seção do estado
      setTasks(prev => {
        const newTasks = { ...prev };
        delete newTasks[sectionId];
        return newTasks;
      });
    } catch (error) {
      console.error('Erro ao excluir seção:', error);
      alert('Erro ao excluir seção. Tente novamente.');
    }
  };

  const handleCreateTask = async () => {
    if (!newTask.title.trim() || !newTask.sectionId) return;
    
    try {
      const newTaskData = await taskService.createTask({
        title: newTask.title,
        description: newTask.description,
        sectionId: newTask.sectionId,
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
      const updatedTask = await taskService.updateTask(task.id, {
        completed: !task.completed
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
              <div className="section-header">
                <h3 className="section-title">{section.name}</h3>
                <button
                  className="btn-icon btn-danger"
                  onClick={() => handleDeleteSection(section.id)}
                  title="Excluir seção"
                >
                  <i className="fas fa-trash"></i>
                </button>
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
                        <span className="task-title">{task.title}</span>
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