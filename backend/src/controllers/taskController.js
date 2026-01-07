const Task = require('../models/Task');
const Section = require('../models/Section');
const WorkArea = require('../models/WorkArea');
const { v4: uuidv4 } = require('uuid');

exports.createTask = async (req, res) => {
  try {
    const { title, description, section_id } = req.body;
    const userId = req.userId;
    
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
    
    const section = await Section.findById(section_id);
    if (!section) {
      return res.status(404).json({
        success: false,
        message: 'Seção não encontrada'
      });
    }
    
    const workArea = await WorkArea.findById(section.work_area_id);
    if (!workArea || String(workArea.user_id) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado'
      });
    }
    
    const taskData = {
      id: uuidv4(),
      title: title.trim(),
      description: description ? description.trim() : '',
      section_id,
      user_id: userId,
      completed: false
    };
    
    await Task.create(taskData);
    
    res.status(201).json({
      success: true,
      data: taskData
    });
  } catch (error) {
    console.error('Erro ao criar tarefa:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao criar tarefa',
      error: error.message
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
    const { title, description, completed } = req.body;
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
    if (completed !== undefined) updateData.completed = completed;
    
    const updated = await Task.update(id, updateData);
    
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
    
    const deleted = await Task.delete(id);
    
    if (deleted) {
      res.status(200).json({
        success: true,
        message: 'Tarefa deletada com sucesso'
      });
    } else {
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