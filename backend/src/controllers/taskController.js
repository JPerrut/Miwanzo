const Task = require('../models/Task');
const Section = require('../models/Section');
const WorkArea = require('../models/WorkArea');
const { v4: uuidv4 } = require('uuid');

exports.createTask = async (req, res) => {
  try {
    const { title, description, section_id } = req.body;
    const userId = req.userId;
    
    console.log('Creating task with data:', { title, description, section_id, userId });
    
    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Título da tarefa é obrigatório'
      });
    }
    
    if (!section_id) {
      return res.status(400).json({
        success: false,
        message: 'ID da seção é obrigatório'
      });
    }
    
    // Verify section exists and belongs to user
    const section = await Section.findById(section_id);
    if (!section) {
      return res.status(404).json({
        success: false,
        message: 'Seção não encontrada'
      });
    }
    
    // Verify work area belongs to user
    const workArea = await WorkArea.findById(section.work_area_id);
    if (!workArea || String(workArea.user_id) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado'
      });
    }
    
    // Create task using the Task model
    const newTask = await Task.create({
      title: title.trim(),
      description: description ? description.trim() : null,
      section_id: section_id,
      user_id: userId,
      status: 'PENDING',
      priority: 'MEDIUM'
    });
    
    console.log('Task created successfully:', newTask);
    
    res.status(201).json({
      success: true,
      data: newTask
    });
  } catch (error) {
    console.error('Erro ao criar tarefa:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao criar tarefa',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

exports.getTasksBySection = async (req, res) => {
  try {
    const { section_id } = req.query;
    const userId = req.userId;
    
    const section = await Section.findById(section_id);
    
    if (!section) {
      return res.status(404).json({
        success: false,
        message: 'Seção não encontrada'
      });
    }
    
    const workAreaId = section.work_area_id;
    if (!workAreaId) {
      return res.status(500).json({
        success: false,
        message: 'Erro interno - work_area_id não encontrado'
      });
    }
    
    const workArea = await WorkArea.findById(workAreaId);
    if (!workArea) {
      return res.status(404).json({
        success: false,
        message: 'Área de trabalho não encontrada'
      });
    }
    
    if (String(workArea.user_id) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado'
      });
    }
    
    const tasks = await Task.findBySectionId(section_id);
    
    res.status(200).json({
      success: true,
      data: tasks
    });
  } catch (error) {
    console.error('Erro ao buscar tarefas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar tarefas',
      error: error.message
    });
  }
};

exports.updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, completed, status } = req.body; // Recebe status também
    const userId = req.userId;
    
    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Tarefa não encontrada'
      });
    }
    
    if (String(task.user_id) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado'
      });
    }
    
    const updateData = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description.trim();
    
    // Se enviar completed, converte para status
    if (completed !== undefined) {
      updateData.status = completed ? 'COMPLETED' : 'PENDING';
      updateData.completed_at = completed ? new Date().toISOString() : null;
    }
    
    // Se enviar status diretamente
    if (status !== undefined) {
      updateData.status = status;
      updateData.completed_at = status === 'COMPLETED' ? new Date().toISOString() : null;
    }
    
    const updated = await Task.update(id, updateData, userId);
    
    if (updated) {
      const updatedTask = await Task.findById(id);
      res.status(200).json({
        success: true,
        data: updatedTask
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Erro ao atualizar tarefa'
      });
    }
  } catch (error) {
    console.error('Erro ao atualizar tarefa:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar tarefa',
      error: error.message
    });
  }
};

exports.deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    console.log('=== DELETE TASK REQUEST ===');
    console.log('Task ID:', id);
    console.log('User ID:', userId);
    
    const task = await Task.findById(id);
    console.log('Task found:', task);

    if (!task) {
      console.log('Task not found');
      return res.status(404).json({
        success: false,
        message: 'Tarefa não encontrada'
      });
    }
    
    if (String(task.user_id) !== String(userId)) {
      console.log('Access denied - user mismatch');
      return res.status(403).json({
        success: false,
        message: 'Acesso negado'
      });
    }

    console.log('Attempting to delete task...');
    const deleted = await Task.delete(id, userId);
    console.log('Delete result:', deleted);
    
    if (deleted) {
      console.log('Task deleted successfully');
      res.status(200).json({
        success: true,
        message: 'Tarefa deletada com sucesso'
      });
    } else {
      console.log('Delete operation failed - no rows affected');
      res.status(400).json({
        success: false,
        message: 'Erro ao deletar tarefa'
      });
    }
  } catch (error) {
    console.error('Erro ao deletar tarefa:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao deletar tarefa',
      error: error.message
    });
  }
};