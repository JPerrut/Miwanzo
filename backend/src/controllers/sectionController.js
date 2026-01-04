const Section = require('../models/Section');
const WorkArea = require('../models/WorkArea');
const Task = require('../models/Task');
const { v4: uuidv4 } = require('uuid');

exports.createSection = async (req, res) => {
  try {
    const { name, workAreaId } = req.body;
    const userId = req.userId;
    
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Nome da seção é obrigatório'
      });
    }
    
    if (!workAreaId) {
      return res.status(400).json({
        success: false,
        message: 'ID da área de trabalho é obrigatório'
      });
    }
    
    // Verificar se a área de trabalho existe e pertence ao usuário
    const workArea = await WorkArea.findById(workAreaId);
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
    
    const sectionData = {
      id: uuidv4(),
      name: name.trim(),
      workAreaId,
      userId
    };

    await Section.create(sectionData);
    
    res.status(201).json({
      success: true,
      data: sectionData
    });
  } catch (error) {
    console.error('Erro ao criar seção:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao criar seção',
      error: error.message
    });
  }
};

exports.getSectionsByWorkArea = async (req, res) => {
  try {
    const { workAreaId } = req.query;
    const userId = req.userId;
    
    console.log('🔍 Buscando seções para workAreaId:', workAreaId);
    console.log('👤 userId da requisição:', userId);
    
    if (!workAreaId) {
      return res.status(400).json({
        success: false,
        message: 'ID da área de trabalho é obrigatório'
      });
    }
    
    // Verificar se a área de trabalho pertence ao usuário
    const workArea = await WorkArea.findById(workAreaId);
    if (!workArea) {
      console.log('❌ Área de trabalho não encontrada');
      return res.status(404).json({
        success: false,
        message: 'Área de trabalho não encontrada'
      });
    }
    
    console.log('📦 Área de trabalho encontrada:', workArea);
    console.log('👤 userId da área:', workArea.user_id);
    console.log('🔍 Comparando:', String(userId), '===', String(workArea.user_id), '?', String(userId) === String(workArea.user_id));
    
    // REMOVA O COMENTÁRIO E CORRIJA A VERIFICAÇÃO:
    if (String(workArea.user_id) !== String(userId)) {
      console.log('🚫 Acesso negado - userId não corresponde');
      return res.status(403).json({
        success: false,
        message: 'Acesso negado'
      });
    }
    
    const sections = await Section.findByWorkAreaId(workAreaId);
    console.log('📋 Seções encontradas:', sections.length);
    
    res.status(200).json({
      success: true,
      data: sections
    });
  } catch (error) {
    console.error('❌ Erro ao buscar seções:', error);
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
    
    // CORREÇÃO: Converta para string antes de comparar
    if (String(section.user_id) !== String(userId)) {
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
    
    // CORREÇÃO: Converta para string antes de comparar
    if (String(section.user_id) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado'
      });
    }
    
    // Deletar todas as tarefas da seção
    await Task.deleteBySectionId(id);
    
    // Deletar a seção
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