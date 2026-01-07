const WorkArea = require('../models/WorkArea');
const Section = require('../models/Section');
const Task = require('../models/Task');

exports.createWorkArea = async (req, res) => {
  try {
    const { name } = req.body;
    const userId = req.userId;
    
    const workAreaData = { name, user_id: userId };
    const workArea = await WorkArea.create(workAreaData);
    
    res.status(201).json({
      success: true,
      data: workArea
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
    const userId = req.userId;
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
    const userId = req.userId;
    
    const workArea = await WorkArea.findById(id, userId);
    
    if (!workArea) {
      return res.status(404).json({
        success: false,
        message: 'Área de trabalho não encontrada ou acesso negado'
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
    const userId = req.userId;
    
    const existingArea = await WorkArea.findById(id, userId);
    if (!existingArea) {
      return res.status(404).json({
        success: false,
        message: 'Área de trabalho não encontrada ou acesso negado'
      });
    }
    
    const updated = await WorkArea.update(id, { name }, userId);
    
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
    const userId = req.userId;
    
    const workArea = await WorkArea.findById(id, userId);
    if (!workArea) {
      return res.status(404).json({
        success: false,
        message: 'Área de trabalho não encontrada ou acesso negado'
      });
    }
    
    const sections = await Section.findByWorkAreaId(id);
    
    for (const section of sections) {
      await Task.deleteBySectionId(section.id);
    }
    
    for (const section of sections) {
      await Section.delete(section.id);
    }
    
    await WorkArea.delete(id, userId);
    
    res.status(200).json({
      success: true,
      message: 'Área de trabalho deletada com sucesso'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao deletar área de trabalho',
      error: error.message
    });
  }
};