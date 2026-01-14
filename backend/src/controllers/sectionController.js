const Section = require('../models/Section');
const WorkArea = require('../models/WorkArea');
const Task = require('../models/Task');
const { v4: uuidv4 } = require('uuid');

exports.createSection = async (req, res) => {
  try {
    const { name } = req.body;  // ← Deve pegar do BODY, não da query
    const { work_area_id } = req.body;  // ← Também do BODY
    const userId = req.userId;
    
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Nome da seção é obrigatório'
      });
    }
    
    if (!work_area_id) {
      return res.status(400).json({
        success: false,
        message: 'ID da área de trabalho é obrigatório'
      });
    }
    
    // Verificar se a work area pertence ao usuário
    const workArea = await WorkArea.findById(work_area_id, userId);
    if (!workArea) {
      return res.status(404).json({
        success: false,
        message: 'Área de trabalho não encontrada ou acesso negado'
      });
    }
    
    // Criar a seção (usando o modelo Section)
    const newSection = await Section.create({
      name: name.trim(),
      work_area_id,
      user_id: userId
    });
    
    res.status(201).json({
      success: true,
      data: newSection
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
    
    console.log('=== TENTANDO DELETAR SEÇÃO ===');
    console.log('ID da seção:', id);
    console.log('ID do usuário:', userId);
    
    // Primeiro verificar se a seção existe e pertence ao usuário
    const section = await Section.findById(id);
    console.log('Seção encontrada:', section);
    
    if (!section) {
      console.log('❌ Seção não encontrada');
      return res.status(404).json({
        success: false,
        message: 'Seção não encontrada'
      });
    }
    
    if (!section.user_id || String(section.user_id) !== String(userId)) {
      console.log('❌ Acesso negado - user_id não corresponde');
      console.log('user_id da seção:', section.user_id);
      console.log('user_id do token:', userId);
      return res.status(403).json({
        success: false,
        message: 'Acesso negado'
      });
    }
    
    console.log('✅ Permissão concedida. Deletando tarefas primeiro...');
    
    // Verificar se há tarefas na seção
    const tasks = await Task.findBySectionId(id);
    console.log(`Tarefas na seção: ${tasks ? tasks.length : 0}`);
    
    // Deletar todas as tarefas da seção primeiro
    if (tasks && tasks.length > 0) {
      console.log(`Deletando ${tasks.length} tarefas...`);
      await Task.deleteBySectionId(id);
    }
    
    console.log('Deletando seção...');
    // Deletar a seção
    await Section.delete(id, userId);
    
    console.log('✅ Seção deletada com sucesso');
    res.status(200).json({
      success: true,
      message: 'Seção deletada com sucesso'
    });
    
  } catch (error) {
    console.error('❌ ERRO ao deletar seção:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Erro ao deletar seção',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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