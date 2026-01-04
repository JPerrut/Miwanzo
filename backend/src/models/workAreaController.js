const WorkArea = require('../models/WorkArea');
const Section = require('../models/Section');
const Task = require('../models/Task');

exports.createWorkArea = async (req, res) => {
  try {
    const { name } = req.body;
    const userId = req.user.id;
    const id = require('uuid').v4();
    
    const workAreaData = { id, name, userId };
    await WorkArea.create(workAreaData);
    
    res.status(201).json({
      success: true,
      data: workAreaData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao criar área de trabalho',
      error: error.message
    });
  }
};

exports.getWorkAreas = async (req, res) => {
  try {
    const userId = req.user.id;
    const workAreas = await WorkArea.findByUserId(userId);
    
    res.status(200).json({
      success: true,
      data: workAreas
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar áreas de trabalho',
      error: error.message
    });
  }
};

exports.getWorkArea = async (req, res) => {
  try {
    const { id } = req.params;
    const workArea = await WorkArea.findById(id);
    
    if (!workArea) {
      return res.status(404).json({
        success: false,
        message: 'Área de trabalho não encontrada'
      });
    }
    
    // Verificar se o usuário tem permissão
    if (workArea.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado'
      });
    }
    
    res.status(200).json({
      success: true,
      data: workArea
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar área de trabalho',
      error: error.message
    });
  }
};

exports.updateWorkArea = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    
    const workArea = await WorkArea.findById(id);
    if (!workArea || workArea.user_id !== req.user.id) {
      return res.status(404).json({
        success: false,
        message: 'Área de trabalho não encontrada ou acesso negado'
      });
    }
    
    const updated = await WorkArea.update(id, { name });
    
    if (updated) {
      res.status(200).json({
        success: true,
        data: { id, name }
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Erro ao atualizar área de trabalho'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar área de trabalho',
      error: error.message
    });
  }
};

exports.deleteWorkArea = async (req, res) => {
  try {
    const { id } = req.params;
    
    const workArea = await WorkArea.findById(id);
    if (!workArea || workArea.user_id !== req.user.id) {
      return res.status(404).json({
        success: false,
        message: 'Área de trabalho não encontrada ou acesso negado'
      });
    }
    
    // Primeiro, buscar todas as seções desta área
    const sections = await Section.findByWorkAreaId(id);
    
    // Deletar todas as tarefas de cada seção
    for (const section of sections) {
      await Task.deleteBySectionId(section.id);
    }
    
    // Deletar todas as seções
    for (const section of sections) {
      await Section.delete(section.id);
    }
    
    // Finalmente, deletar a área de trabalho
    const deleted = await WorkArea.delete(id);
    
    if (deleted) {
      res.status(200).json({
        success: true,
        message: 'Área de trabalho deletada com sucesso'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Erro ao deletar área de trabalho'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao deletar área de trabalho',
      error: error.message
    });
  }
};