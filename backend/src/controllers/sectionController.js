const Section = require('../models/Section');
const WorkArea = require('../models/WorkArea');
const Task = require('../models/Task');
const { v4: uuidv4 } = require('uuid');

exports.createSection = async (req, res) => {
  try {
    const { work_area_id } = req.query;
    const userId = req.userId;
    
    if (!work_area_id) {
      return res.status(400).json({
        success: false,
        message: 'ID da área de trabalho é obrigatório'
      });
    }
    
    const workArea = await WorkArea.findById(work_area_id, userId);

    if (!workArea) {
      return res.status(404).json({
        success: false,
        message: 'Área de trabalho não encontrada ou acesso negado'
      });
    }
    
    const sections = await Section.findByWorkAreaId(work_area_id);
    
    res.status(200).json({
      success: true,
      data: sections
    });
  } catch (error) {
    console.error('Erro ao buscar seções:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar seções',
      error: error.message
    });
  }
};

exports.getSectionsByWorkArea = async (req, res) => {
  try {
    const { work_area_id } = req.query;
    const userId = req.userId;
    
    if (!work_area_id) {
      return res.status(400).json({
        success: false,
        message: 'ID da área de trabalho é obrigatório'
      });
    }
    
    const workArea = await WorkArea.findById(work_area_id);
    if (!workArea) {
      return res.status(404).json({
        success: false,
        message: 'Área de trabalho não encontrada'
      });
    }
    
    if (!workArea.user_id || String(workArea.user_id) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado'
      });
    }
    
    const sections = await Section.findByWorkAreaId(work_area_id);
    
    res.status(200).json({
      success: true,
      data: sections
    });
  } catch (error) {
    console.error('Erro ao buscar seções:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar seções',
      error: error.message
    });
  }
};

exports.getSection = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    
    const section = await Section.findById(id);
    
    if (!section) {
      return res.status(404).json({
        success: false,
        message: 'Seção não encontrada'
      });
    }
    
    if (!section.user_id || String(section.user_id) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado'
      });
    }
    
    res.status(200).json({
      success: true,
      data: section
    });
  } catch (error) {
    console.error('Erro ao buscar seção:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar seção',
      error: error.message
    });
  }
};

exports.deleteSection = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    
    const section = await Section.findById(id);
    if (!section) {
      return res.status(404).json({
        success: false,
        message: 'Seção não encontrada'
      });
    }
    
    if (!section.user_id || String(section.user_id) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado'
      });
    }
    
    await Task.deleteBySectionId(id);
    const deleted = await Section.delete(id);
    
    if (deleted) {
      res.status(200).json({
        success: true,
        message: 'Seção deletada com sucesso'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Erro ao deletar seção'
      });
    }
  } catch (error) {
    console.error('Erro ao deletar seção:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao deletar seção',
      error: error.message
    });
  }
};

exports.updateSection = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const userId = req.userId;
    
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Nome da seção é obrigatório'
      });
    }
    
    const section = await Section.findById(id);
    if (!section) {
      return res.status(404).json({
        success: false,
        message: 'Seção não encontrada'
      });
    }
    
    if (!section.user_id || String(section.user_id) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado'
      });
    }
    
    const updated = await Section.update(id, { name: name.trim() });
    
    if (updated) {
      res.status(200).json({
        success: true,
        data: { id, name: name.trim() }
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Erro ao atualizar seção'
      });
    }
  } catch (error) {
    console.error('Erro ao atualizar seção:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar seção',
      error: error.message
    });
  }
};