const WorkArea = require('../models/WorkArea');
const Section = require('../models/Section');
const Task = require('../models/Task');
const { v4: uuidv4 } = require('uuid');

exports.createWorkArea = async (req, res) => {
  try {
    const { name } = req.body;
    const userId = req.userId;
    
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Nome da área de trabalho é obrigatório'
      });
    }
    
    const workAreaData = {
      id: uuidv4(),
      name: name.trim(),
      userId: userId
    };

    await WorkArea.create(workAreaData);
    
    res.status(201).json({
      success: true,
      data: workAreaData
    });
  } catch (error) {
    console.error('Erro ao criar área de trabalho:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao criar área de trabalho',
      error: error.message
    });
  }
};

exports.getWorkAreas = async (req, res) => {
  try {
    const userId = req.userId;
    const workAreas = await WorkArea.findByUserId(userId);
    
    res.status(200).json({
      success: true,
      data: workAreas
    });
  } catch (error) {
    console.error('Erro ao buscar áreas de trabalho:', error);
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
    const userId = req.userId;
    
    const workArea = await WorkArea.findById(id);
    
    if (!workArea) {
      return res.status(404).json({
        success: false,
        message: 'Área de trabalho não encontrada'
      });
    }
    
    // DESCOMENTE E CORRIJA ESTA VERIFICAÇÃO:
    if (String(workArea.user_id) !== String(userId)) {
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
    console.error('Erro ao buscar área de trabalho:', error);
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
    const userId = req.userId;
    
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Nome da área de trabalho é obrigatório'
      });
    }
    
    const workArea = await WorkArea.findById(id);
    if (!workArea) {
      return res.status(404).json({
        success: false,
        message: 'Área de trabalho não encontrada'
      });
    }
    
    // CORREÇÃO: Converta para string antes de comparar
    if (String(workArea.user_id) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado'
      });
    }
    
    const updated = await WorkArea.update(id, { name: name.trim() });
    
    if (updated) {
      res.status(200).json({
        success: true,
        data: { ...workArea, name: name.trim() }
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Erro ao atualizar área de trabalho'
      });
    }
  } catch (error) {
    console.error('Erro ao atualizar área de trabalho:', error);
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
    const userId = req.userId;
    
    const workArea = await WorkArea.findById(id);
    if (!workArea) {
      return res.status(404).json({
        success: false,
        message: 'Área de trabalho não encontrada'
      });
    }
    
    // CORREÇÃO: Converta para string antes de comparar
    if (String(workArea.user_id) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado'
      });
    }
    
    // Buscar seções desta área
    const sections = await Section.findByWorkAreaId(id);
    
    // Deletar tarefas de cada seção
    for (const section of sections) {
      await Task.deleteBySectionId(section.id);
    }
    
    // Deletar seções
    for (const section of sections) {
      await Section.delete(section.id);
    }
    
    // Deletar área de trabalho
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
    console.error('Erro ao deletar área de trabalho:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao deletar área de trabalho',
      error: error.message
    });
  }
};