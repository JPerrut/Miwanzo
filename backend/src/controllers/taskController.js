const Task = require('../models/Task');
const Section = require('../models/Section');
const WorkArea = require('../models/WorkArea');

exports.createTask = async (req, res) => {
  try {
    const { title, description, section_id, status, priority, order_index } = req.body;
    const userId = req.userId;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Titulo da tarefa e obrigatorio',
      });
    }

    if (!section_id) {
      return res.status(400).json({
        success: false,
        message: 'ID da secao e obrigatorio',
      });
    }

    const section = await Section.findById(section_id);
    if (!section) {
      return res.status(404).json({
        success: false,
        message: 'Secao nao encontrada',
      });
    }

    const workArea = await WorkArea.findById(section.work_area_id);
    if (!workArea || String(workArea.user_id) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado',
      });
    }

    const newTask = await Task.create({
      title: title.trim(),
      description: description ? description.trim() : null,
      section_id,
      user_id: userId,
      status: status || 'PENDING',
      priority: priority || 'MEDIUM',
      order_index: Number.isInteger(order_index) ? order_index : 0,
    });

    res.status(201).json({
      success: true,
      data: newTask,
    });
  } catch (error) {
    console.error('Erro ao criar tarefa:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao criar tarefa',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
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
        message: 'Secao nao encontrada',
      });
    }

    const workArea = await WorkArea.findById(section.work_area_id);
    if (!workArea) {
      return res.status(404).json({
        success: false,
        message: 'Area de trabalho nao encontrada',
      });
    }

    if (String(workArea.user_id) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado',
      });
    }

    const tasks = await Task.findBySectionId(section_id);

    res.status(200).json({
      success: true,
      data: tasks,
    });
  } catch (error) {
    console.error('Erro ao buscar tarefas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar tarefas',
      error: error.message,
    });
  }
};

exports.updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, completed, status, section_id, order_index } = req.body;
    const userId = req.userId;

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Tarefa nao encontrada',
      });
    }

    if (String(task.user_id) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado',
      });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = String(title).trim();
    if (description !== undefined) {
      updateData.description = description === null ? null : String(description).trim();
    }

    if (completed !== undefined) {
      updateData.status = completed ? 'COMPLETED' : 'PENDING';
      updateData.completed_at = completed ? new Date().toISOString() : null;
    }

    if (status !== undefined) {
      updateData.status = status;
      updateData.completed_at = status === 'COMPLETED' ? new Date().toISOString() : null;
    }

    if (section_id !== undefined) {
      if (section_id === null) {
        updateData.section_id = null;
      } else {
        const section = await Section.findById(section_id);
        if (!section || String(section.user_id) !== String(userId)) {
          return res.status(403).json({
            success: false,
            message: 'Secao de destino invalida',
          });
        }
        updateData.section_id = section_id;
      }
    }

    if (order_index !== undefined) {
      updateData.order_index = Number(order_index);
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nenhuma alteracao informada',
      });
    }

    const updated = await Task.update(id, updateData, userId);
    if (!updated) {
      return res.status(400).json({
        success: false,
        message: 'Erro ao atualizar tarefa',
      });
    }

    const updatedTask = await Task.findById(id);
    res.status(200).json({
      success: true,
      data: updatedTask,
    });
  } catch (error) {
    console.error('Erro ao atualizar tarefa:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar tarefa',
      error: error.message,
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
        message: 'Tarefa nao encontrada',
      });
    }

    if (String(task.user_id) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado',
      });
    }

    const deleted = await Task.delete(id, userId);
    if (!deleted) {
      return res.status(400).json({
        success: false,
        message: 'Erro ao deletar tarefa',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Tarefa deletada com sucesso',
    });
  } catch (error) {
    console.error('Erro ao deletar tarefa:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao deletar tarefa',
      error: error.message,
    });
  }
};
