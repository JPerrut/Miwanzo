const Section = require('../models/Section');
const WorkArea = require('../models/WorkArea');
const Task = require('../models/Task');

const normalizeSectionName = (value) => String(value || '').trim().replace(/\s+/g, ' ');

exports.createSection = async (req, res) => {
  try {
    const { name, work_area_id, description, order_index } = req.body;
    const userId = req.userId;
    const normalizedName = normalizeSectionName(name);

    if (!normalizedName) {
      return res.status(400).json({
        success: false,
        message: 'Nome da secao e obrigatorio',
      });
    }

    if (!work_area_id) {
      return res.status(400).json({
        success: false,
        message: 'ID da area de trabalho e obrigatorio',
      });
    }

    const workArea = await WorkArea.findById(work_area_id, userId);
    if (!workArea) {
      return res.status(404).json({
        success: false,
        message: 'Area de trabalho nao encontrada ou acesso negado',
      });
    }

    const duplicatedSection = await Section.findByNameInWorkArea(work_area_id, normalizedName);
    if (duplicatedSection) {
      return res.status(409).json({
        success: false,
        message: 'Ja existe uma secao com esse nome nesta area de trabalho',
      });
    }

    const newSection = await Section.create({
      name: normalizedName,
      work_area_id,
      user_id: userId,
      description: description ? String(description) : null,
      order_index: Number.isInteger(order_index) ? order_index : undefined,
    });

    res.status(201).json({
      success: true,
      data: newSection,
    });
  } catch (error) {
    console.error('Erro ao criar secao:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao criar secao',
      error: error.message,
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
        message: 'ID da area de trabalho e obrigatorio',
      });
    }

    const workArea = await WorkArea.findById(work_area_id);
    if (!workArea) {
      return res.status(404).json({
        success: false,
        message: 'Area de trabalho nao encontrada',
      });
    }

    if (!workArea.user_id || String(workArea.user_id) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado',
      });
    }

    const sections = await Section.findByWorkAreaId(work_area_id);

    res.status(200).json({
      success: true,
      data: sections,
    });
  } catch (error) {
    console.error('Erro ao buscar secoes:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar secoes',
      error: error.message,
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
        message: 'Secao nao encontrada',
      });
    }

    if (!section.user_id || String(section.user_id) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado',
      });
    }

    res.status(200).json({
      success: true,
      data: section,
    });
  } catch (error) {
    console.error('Erro ao buscar secao:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar secao',
      error: error.message,
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
        message: 'Secao nao encontrada',
      });
    }

    if (!section.user_id || String(section.user_id) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado',
      });
    }

    const tasks = await Task.findBySectionId(id);
    if (tasks && tasks.length > 0) {
      await Task.deleteBySectionId(id);
    }

    await Section.delete(id, userId);

    res.status(200).json({
      success: true,
      message: 'Secao deletada com sucesso',
    });
  } catch (error) {
    console.error('Erro ao deletar secao:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao deletar secao',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

exports.updateSection = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, order_index, work_area_id } = req.body;
    const userId = req.userId;

    const section = await Section.findById(id);
    if (!section) {
      return res.status(404).json({
        success: false,
        message: 'Secao nao encontrada',
      });
    }

    if (!section.user_id || String(section.user_id) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado',
      });
    }

    const updates = {};
    if (name !== undefined) {
      const normalizedName = normalizeSectionName(name);
      if (!normalizedName) {
        return res.status(400).json({
          success: false,
          message: 'Nome da secao e obrigatorio',
        });
      }
      updates.name = normalizedName;
    }
    if (description !== undefined) {
      updates.description = description === null ? null : String(description);
    }
    if (order_index !== undefined) {
      updates.order_index = Number(order_index);
    }
    if (work_area_id !== undefined) {
      updates.work_area_id = work_area_id;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nenhuma alteracao informada',
      });
    }

    if (updates.name !== undefined || updates.work_area_id !== undefined) {
      const targetWorkAreaId = updates.work_area_id || section.work_area_id;
      const targetName = updates.name || section.name;
      const duplicatedSection = await Section.findByNameInWorkArea(
        targetWorkAreaId,
        targetName,
        id,
      );

      if (duplicatedSection) {
        return res.status(409).json({
          success: false,
          message: 'Ja existe uma secao com esse nome nesta area de trabalho',
        });
      }
    }

    const updated = await Section.update(id, updates, userId);

    if (!updated) {
      return res.status(400).json({
        success: false,
        message: 'Erro ao atualizar secao',
      });
    }

    res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error('Erro ao atualizar secao:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar secao',
      error: error.message,
    });
  }
};
