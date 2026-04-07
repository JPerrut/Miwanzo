import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { authService } from '../services/auth';
import { sectionService } from '../services/sectionService';
import { taskService } from '../services/taskService';
import { workAreaService } from '../services/workAreaService';
import './WorkAreaPage.css';

const COLUMN_TYPES = [
  { value: 'BACKLOG', label: 'Backlog', hint: 'Entrada inicial de ideias' },
  { value: 'TODO', label: 'A Fazer', hint: 'Itens prontos para iniciar' },
  { value: 'IN_PROGRESS', label: 'Em Progresso', hint: 'Execucao ativa' },
  { value: 'REVIEW', label: 'Revisao', hint: 'Conferencia e ajustes' },
  { value: 'DONE', label: 'Concluido', hint: 'Entregas finalizadas' },
  { value: 'CUSTOM', label: 'Personalizado', hint: 'Fluxo customizado' },
];

const TASK_FIELD_TYPES = [
  { value: 'text', label: 'Texto', icon: 'fa-font', defaultName: 'Texto' },
  { value: 'number', label: 'Numero', icon: 'fa-hashtag', defaultName: 'Numero' },
  { value: 'date', label: 'Data', icon: 'fa-calendar-days', defaultName: 'Data' },
  { value: 'currency', label: 'Moeda', icon: 'fa-dollar-sign', defaultName: 'Moeda' },
  { value: 'select', label: 'Select', icon: 'fa-list', defaultName: 'Select' },
];

const DEFAULT_SECTION_META = {
  columnType: 'CUSTOM',
  topic: '',
  primaryColumnName: 'Nome da tarefa',
  taskColumns: [],
};

const normalizeTaskColumns = (taskColumns) =>
  Array.isArray(taskColumns)
    ? taskColumns
        .map((column) => ({
          id: column.id || `col_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
          name: column.name || 'Nova coluna',
          type: ['text', 'number', 'date', 'currency', 'select'].includes(column.type)
            ? column.type
            : 'text',
        }))
        .filter((column) => Boolean(column.name?.trim()))
    : [];

const getSectionMeta = (description) => {
  if (!description) return DEFAULT_SECTION_META;

  try {
    const parsed = JSON.parse(description);
    if (parsed && typeof parsed === 'object') {
      return {
        columnType: parsed.columnType || DEFAULT_SECTION_META.columnType,
        topic: parsed.topic || '',
        primaryColumnName: parsed.primaryColumnName || DEFAULT_SECTION_META.primaryColumnName,
        taskColumns: normalizeTaskColumns(parsed.taskColumns),
      };
    }
  } catch (_error) {
    return { ...DEFAULT_SECTION_META, topic: String(description) };
  }

  return DEFAULT_SECTION_META;
};

const serializeSectionMeta = (meta) =>
  JSON.stringify({
    columnType: meta.columnType || DEFAULT_SECTION_META.columnType,
    topic: (meta.topic || '').trim(),
    primaryColumnName: (meta.primaryColumnName || DEFAULT_SECTION_META.primaryColumnName).trim(),
    taskColumns: normalizeTaskColumns(meta.taskColumns),
  });

const parseTaskPayload = (description) => {
  if (!description) return { notes: '', fields: {} };

  try {
    const parsed = JSON.parse(description);
    if (parsed && parsed.format === 'task_fields_v1') {
      return {
        notes: parsed.notes || '',
        fields: parsed.fields && typeof parsed.fields === 'object' ? parsed.fields : {},
      };
    }
  } catch (_error) {
    return { notes: String(description), fields: {} };
  }

  return { notes: String(description), fields: {} };
};

const serializeTaskPayload = ({ notes, fields }) => {
  const cleanedFields = Object.entries(fields || {}).reduce((acc, [key, value]) => {
    if (value === null || value === undefined || String(value).trim() === '') return acc;
    acc[key] = String(value).trim();
    return acc;
  }, {});

  const cleanedNotes = (notes || '').trim();
  if (!cleanedNotes && Object.keys(cleanedFields).length === 0) return null;

  return JSON.stringify({
    format: 'task_fields_v1',
    notes: cleanedNotes,
    fields: cleanedFields,
  });
};

const attachTaskPayload = (task) => {
  const payload = parseTaskPayload(task.description);
  return {
    ...task,
    _taskPayload: payload,
  };
};

const getDefaultColumnNameByType = (columnType, existingColumns) => {
  const typeConfig = TASK_FIELD_TYPES.find((type) => type.value === columnType);
  const baseName = typeConfig?.defaultName || 'Coluna';
  const normalizedExisting = new Set((existingColumns || []).map((column) => column.name?.trim().toLowerCase()));
  if (!normalizedExisting.has(baseName.toLowerCase())) return baseName;

  let nextIndex = 2;
  while (normalizedExisting.has(`${baseName} ${nextIndex}`.toLowerCase())) {
    nextIndex += 1;
  }
  return `${baseName} ${nextIndex}`;
};

const formatTaskFieldValue = (value, type) => {
  if (value === null || value === undefined || String(value).trim() === '') return '-';
  if (type === 'currency') {
    const numeric = Number(String(value).replace(',', '.'));
    if (Number.isFinite(numeric)) {
      return numeric.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }
    return value;
  }
  return value;
};

const getInputTypeForField = (fieldType) => {
  if (fieldType === 'number' || fieldType === 'currency') return 'number';
  if (fieldType === 'date') return 'date';
  return 'text';
};

const COLUMN_WIDTHS_STORAGE_KEY = 'miwanzo_column_widths_v2';
const PRIMARY_COLUMN_KEY = '__primary__';
const ESTIMATED_COLUMN_CHAR_WIDTH = 8;
const MIN_PRIMARY_WIDTH_FALLBACK = 120;
const MIN_CUSTOM_WIDTH_FALLBACK = 136;
const MAX_PRIMARY_WIDTH_FALLBACK = 260;
const MAX_CUSTOM_WIDTH_FALLBACK = 300;

const clampNumber = (value, min, max) => Math.min(Math.max(value, min), max);

const getNaturalColumnWidthByName = (columnName, isPrimaryColumn = false) => {
  const safeName = String(columnName || '').trim();
  const textWidth = Math.max(1, safeName.length) * ESTIMATED_COLUMN_CHAR_WIDTH;
  const basePadding = isPrimaryColumn ? 42 : 72;
  const minWidth = isPrimaryColumn ? MIN_PRIMARY_WIDTH_FALLBACK : MIN_CUSTOM_WIDTH_FALLBACK;
  const maxWidth = isPrimaryColumn ? MAX_PRIMARY_WIDTH_FALLBACK : MAX_CUSTOM_WIDTH_FALLBACK;
  return clampNumber(Math.round(textWidth + basePadding), minWidth, maxWidth);
};

const loadColumnWidthsFromStorage = () => {
  if (typeof window === 'undefined') return {};

  try {
    const stored = window.localStorage.getItem(COLUMN_WIDTHS_STORAGE_KEY);
    if (!stored) return {};
    const parsed = JSON.parse(stored);
    if (!parsed || typeof parsed !== 'object') return {};

    return Object.entries(parsed).reduce((acc, [sectionId, widthMap]) => {
      if (!widthMap || typeof widthMap !== 'object') return acc;

      const normalizedMap = Object.entries(widthMap).reduce((sectionAcc, [columnKey, rawWidth]) => {
        const numericWidth = Number(rawWidth);
        if (!Number.isFinite(numericWidth)) return sectionAcc;
        sectionAcc[columnKey] = Math.max(48, Math.round(numericWidth));
        return sectionAcc;
      }, {});

      if (Object.keys(normalizedMap).length > 0) {
        acc[sectionId] = normalizedMap;
      }

      return acc;
    }, {});
  } catch (_error) {
    return {};
  }
};

const sortByOrder = (items) =>
  [...items].sort((a, b) => {
    const aOrder = Number.isFinite(Number(a.order_index)) ? Number(a.order_index) : 0;
    const bOrder = Number.isFinite(Number(b.order_index)) ? Number(b.order_index) : 0;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
  });

const WorkAreaPage = () => {
  const { workAreaId } = useParams();
  const navigate = useNavigate();

  const [workArea, setWorkArea] = useState(null);
  const [sections, setSections] = useState([]);
  const [tasks, setTasks] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showSectionModal, setShowSectionModal] = useState(false);
  const [showDeleteSectionModal, setShowDeleteSectionModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [deletingColumnTarget, setDeletingColumnTarget] = useState(null);

  const [newSectionName, setNewSectionName] = useState('');
  const [deletingSection, setDeletingSection] = useState(null);

  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    sectionId: '',
    fields: {},
  });

  const [editingTask, setEditingTask] = useState(null);
  const [editedTaskName, setEditedTaskName] = useState('');

  const [editingSectionId, setEditingSectionId] = useState(null);
  const [editingSectionName, setEditingSectionName] = useState('');

  const [draggingTask, setDraggingTask] = useState(null);
  const [dragOverSectionId, setDragOverSectionId] = useState(null);
  const [selectedTasks, setSelectedTasks] = useState({});
  const [columnTypeMenu, setColumnTypeMenu] = useState(null);
  const [columnActionsMenu, setColumnActionsMenu] = useState(null);
  const [editingColumnInline, setEditingColumnInline] = useState(null);
  const [inlineTaskDraftBySection, setInlineTaskDraftBySection] = useState({});
  const [creatingInlineTaskBySection, setCreatingInlineTaskBySection] = useState({});
  const [columnWidthsBySection, setColumnWidthsBySection] = useState(() =>
    loadColumnWidthsFromStorage(),
  );
  const [resizingColumn, setResizingColumn] = useState(null);

  const sectionMetaById = useMemo(() => {
    const map = {};
    sections.forEach((section) => {
      map[section.id] = getSectionMeta(section.description);
    });
    return map;
  }, [sections]);

  const activeColumnMenuContext = useMemo(() => {
    if (!columnActionsMenu) return null;
    const section = sections.find((item) => item.id === columnActionsMenu.sectionId);
    if (!section) return null;
    const column = (sectionMetaById[section.id]?.taskColumns || []).find(
      (item) => item.id === columnActionsMenu.columnId,
    );
    if (!column) return null;
    return { section, column };
  }, [columnActionsMenu, sectionMetaById, sections]);

  const activeColumnTypeSection = useMemo(() => {
    if (!columnTypeMenu) return null;
    return sections.find((item) => item.id === columnTypeMenu.sectionId) || null;
  }, [columnTypeMenu, sections]);

  const getTaskColumnsForSection = (sectionId) => sectionMetaById[sectionId]?.taskColumns || [];

  const getPrimaryColumnName = (sectionId) =>
    sectionMetaById[sectionId]?.primaryColumnName || DEFAULT_SECTION_META.primaryColumnName;

  const getColumnMinWidth = (sectionId, columnKey, isPrimaryColumn = false) => {
    if (isPrimaryColumn) {
      return getNaturalColumnWidthByName(getPrimaryColumnName(sectionId), true);
    }

    const targetColumn = getTaskColumnsForSection(sectionId).find((column) => column.id === columnKey);
    return getNaturalColumnWidthByName(targetColumn?.name || 'Coluna', false);
  };

  const getColumnWidth = (sectionId, columnKey, isPrimaryColumn = false) => {
    const minWidth = getColumnMinWidth(sectionId, columnKey, isPrimaryColumn);
    const stored = Number(columnWidthsBySection?.[sectionId]?.[columnKey]);
    if (!Number.isFinite(stored)) return minWidth;
    return Math.max(minWidth, Math.round(stored));
  };

  const getColumnSizeStyle = (sectionId, columnKey, isPrimaryColumn = false) => {
    const width = getColumnWidth(sectionId, columnKey, isPrimaryColumn);
    return {
      width: `${width}px`,
      minWidth: `${width}px`,
      maxWidth: `${width}px`,
    };
  };

  const handleColumnResizeStart = (event, sectionId, columnKey, isPrimaryColumn = false) => {
    event.preventDefault();
    event.stopPropagation();

    setResizingColumn({
      sectionId,
      columnKey,
      startX: event.clientX,
      startWidth: getColumnWidth(sectionId, columnKey, isPrimaryColumn),
      minWidth: getColumnMinWidth(sectionId, columnKey, isPrimaryColumn),
    });
  };

  const initTaskFieldsForSection = (sectionId, preservedFields = {}) => {
    const columns = getTaskColumnsForSection(sectionId);
    return columns.reduce((acc, column) => {
      acc[column.id] = preservedFields[column.id] || '';
      return acc;
    }, {});
  };

  const totalTasksCount = useMemo(
    () => sections.reduce((sum, section) => sum + (tasks[section.id] || []).length, 0),
    [sections, tasks],
  );

  const totalSelectedTasks = useMemo(
    () =>
      Object.values(selectedTasks).reduce(
        (sum, sectionSelection) =>
          sum + Object.values(sectionSelection || {}).filter(Boolean).length,
        0,
      ),
    [selectedTasks],
  );

  const allTasksSelected = totalTasksCount > 0 && totalSelectedTasks === totalTasksCount;

  const isTaskSelected = (sectionId, taskId) => Boolean(selectedTasks[sectionId]?.[taskId]);

  const areAllSectionTasksSelected = (sectionId) => {
    const sectionTasks = tasks[sectionId] || [];
    if (sectionTasks.length === 0) return false;
    return sectionTasks.every((task) => isTaskSelected(sectionId, task.id));
  };

  const clearTaskSelection = () => {
    setSelectedTasks({});
  };

  const toggleTaskSelection = (sectionId, taskId) => {
    setSelectedTasks((prev) => {
      const currentSection = prev[sectionId] || {};
      const nextChecked = !currentSection[taskId];
      const nextSection = { ...currentSection, [taskId]: nextChecked };

      if (!nextChecked) {
        delete nextSection[taskId];
      }

      const nextState = { ...prev };
      if (Object.keys(nextSection).length === 0) {
        delete nextState[sectionId];
      } else {
        nextState[sectionId] = nextSection;
      }

      return nextState;
    });
  };

  const toggleSelectSectionTasks = (sectionId) => {
    const sectionTasks = tasks[sectionId] || [];
    if (sectionTasks.length === 0) return;

    const shouldSelectAll = !areAllSectionTasksSelected(sectionId);
    setSelectedTasks((prev) => {
      const next = { ...prev };
      if (shouldSelectAll) {
        next[sectionId] = sectionTasks.reduce((acc, task) => {
          acc[task.id] = true;
          return acc;
        }, {});
      } else {
        delete next[sectionId];
      }
      return next;
    });
  };

  const toggleSelectAllTasks = () => {
    if (allTasksSelected) {
      clearTaskSelection();
      return;
    }

    const next = {};
    sections.forEach((section) => {
      const sectionTasks = tasks[section.id] || [];
      if (sectionTasks.length === 0) return;
      next[section.id] = sectionTasks.reduce((acc, task) => {
        acc[task.id] = true;
        return acc;
      }, {});
    });
    setSelectedTasks(next);
  };

  const getSelectedTasksGroupedBySection = () => {
    const grouped = {};
    sections.forEach((section) => {
      const sectionSelection = selectedTasks[section.id] || {};
      const selectedInSection = (tasks[section.id] || []).filter((task) => sectionSelection[task.id]);
      if (selectedInSection.length > 0) {
        grouped[section.id] = selectedInSection;
      }
    });
    return grouped;
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        const authResult = await authService.verifyToken();
        if (!authResult.valid) {
          navigate('/login');
          return;
        }

        const workAreaData = await workAreaService.getWorkArea(workAreaId);
        setWorkArea(workAreaData);

        const sectionItems = sortByOrder(await sectionService.getSectionsByWorkArea(workAreaId));
        setSections(sectionItems);

        const taskMap = {};
        for (const section of sectionItems) {
          const sectionTasks = sortByOrder(await taskService.getTasksBySection(section.id));
          taskMap[section.id] = sectionTasks.map((task, index) => ({
            ...attachTaskPayload(task),
            section_id: section.id,
            order_index: Number.isFinite(Number(task.order_index)) ? Number(task.order_index) : index,
          }));
        }
        setTasks(taskMap);
      } catch (loadError) {
        console.error('Erro ao carregar area de trabalho:', loadError);
        setError('Erro ao carregar a area de trabalho. Tente novamente.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [navigate, workAreaId]);

  useEffect(() => {
    setSelectedTasks((prev) => {
      const next = {};

      Object.entries(prev).forEach(([sectionId, sectionSelection]) => {
        const validIds = new Set((tasks[sectionId] || []).map((task) => task.id));
        const filtered = Object.entries(sectionSelection || {}).reduce((acc, [taskId, selected]) => {
          if (selected && validIds.has(taskId)) {
            acc[taskId] = true;
          }
          return acc;
        }, {});

        if (Object.keys(filtered).length > 0) {
          next[sectionId] = filtered;
        }
      });

      return JSON.stringify(prev) === JSON.stringify(next) ? prev : next;
    });
  }, [tasks]);

  useEffect(() => {
    if (!columnTypeMenu && !columnActionsMenu) return undefined;

    const handleClickOutside = (event) => {
      if (
        !event.target.closest('.column-add-menu-anchor') &&
        !event.target.closest('.column-type-popup-floating')
      ) {
        setColumnTypeMenu(null);
      }

      if (
        !event.target.closest('.column-actions-menu-anchor') &&
        !event.target.closest('.column-actions-popup-floating')
      ) {
        setColumnActionsMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [columnTypeMenu, columnActionsMenu]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const hasWidths = Object.values(columnWidthsBySection).some(
        (widthMap) => widthMap && Object.keys(widthMap).length > 0,
      );

      if (!hasWidths) {
        window.localStorage.removeItem(COLUMN_WIDTHS_STORAGE_KEY);
        return;
      }

      window.localStorage.setItem(COLUMN_WIDTHS_STORAGE_KEY, JSON.stringify(columnWidthsBySection));
    } catch (_error) {
      // ignore localStorage write errors
    }
  }, [columnWidthsBySection]);

  useEffect(() => {
    if (!resizingColumn) return undefined;

    const handleMouseMove = (event) => {
      const delta = event.clientX - resizingColumn.startX;
      const nextWidth = Math.max(resizingColumn.minWidth, Math.round(resizingColumn.startWidth + delta));

      setColumnWidthsBySection((prev) => {
        const currentSection = prev[resizingColumn.sectionId] || {};
        if (currentSection[resizingColumn.columnKey] === nextWidth) return prev;

        return {
          ...prev,
          [resizingColumn.sectionId]: {
            ...currentSection,
            [resizingColumn.columnKey]: nextWidth,
          },
        };
      });
    };

    const handleMouseUp = () => {
      setResizingColumn(null);
    };

    document.body.classList.add('is-col-resizing');
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.body.classList.remove('is-col-resizing');
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingColumn]);

  const handleCreateSection = async () => {
    if (!newSectionName.trim()) return;

    try {
      const created = await sectionService.createSection({
        name: newSectionName.trim(),
        work_area_id: workAreaId,
        description: serializeSectionMeta({
          columnType: DEFAULT_SECTION_META.columnType,
          topic: '',
          primaryColumnName: DEFAULT_SECTION_META.primaryColumnName,
          taskColumns: [],
        }),
      });

      setSections((prev) =>
        sortByOrder([
          ...prev,
          {
            ...created,
            description: created.description || serializeSectionMeta({
              columnType: DEFAULT_SECTION_META.columnType,
              topic: '',
              primaryColumnName: DEFAULT_SECTION_META.primaryColumnName,
              taskColumns: [],
            }),
          },
        ]),
      );
      setTasks((prev) => ({ ...prev, [created.id]: [] }));

      setNewSectionName('');
      setShowSectionModal(false);
    } catch (createError) {
      console.error('Erro ao criar secao:', createError);
      alert('Erro ao criar secao. Tente novamente.');
    }
  };

  const toggleColumnTypeMenu = (event, sectionId) => {
    event.stopPropagation();
    setColumnActionsMenu(null);
    const triggerRect = event.currentTarget.getBoundingClientRect();
    const popupWidthEstimate = 240;
    const left = Math.max(12, Math.min(triggerRect.left - 8, window.innerWidth - popupWidthEstimate - 12));
    const top = triggerRect.bottom + 6;

    setColumnTypeMenu((prev) =>
      prev?.sectionId === sectionId ? null : { sectionId, top, left },
    );
  };

  const saveSectionTaskColumns = async (section, nextTaskColumns) => {
    const baseMeta = sectionMetaById[section.id] || DEFAULT_SECTION_META;
    const updatedMeta = {
      ...baseMeta,
      taskColumns: normalizeTaskColumns(nextTaskColumns),
    };

    const updated = await sectionService.updateSection(section.id, {
      description: serializeSectionMeta(updatedMeta),
    });

    setSections((prev) =>
      prev.map((item) =>
        item.id === section.id
          ? { ...item, ...updated, description: serializeSectionMeta(updatedMeta) }
          : item,
      ),
    );
  };

  const handleCreateColumn = async (section, columnType) => {
    try {
      const baseMeta = sectionMetaById[section.id] || DEFAULT_SECTION_META;
      const currentColumns = normalizeTaskColumns(baseMeta.taskColumns);
      const newColumnName = getDefaultColumnNameByType(columnType, currentColumns);
      const newColumn = {
        id: `col_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
        name: newColumnName,
        type: columnType,
      };

      const updatedMeta = {
        ...baseMeta,
        taskColumns: [...currentColumns, newColumn],
      };

      await saveSectionTaskColumns(section, updatedMeta.taskColumns);
      setColumnTypeMenu(null);
    } catch (createColumnError) {
      console.error('Erro ao criar coluna:', createColumnError);
      alert('Erro ao criar coluna. Tente novamente.');
    }
  };

  const toggleColumnActionsMenu = (event, sectionId, columnId) => {
    event.stopPropagation();
    setColumnTypeMenu(null);
    const triggerRect = event.currentTarget.getBoundingClientRect();
    const popupWidthEstimate = 220;
    const left = Math.max(12, Math.min(triggerRect.left - 6, window.innerWidth - popupWidthEstimate - 12));
    const top = triggerRect.bottom + 6;
    setColumnActionsMenu((prev) =>
      prev?.sectionId === sectionId && prev?.columnId === columnId
        ? null
        : { sectionId, columnId, top, left },
    );
  };

  const handleEditColumn = (section, column) => {
    setColumnActionsMenu(null);
    setEditingColumnInline({
      sectionId: section.id,
      columnId: column.id,
      name: column.name,
    });
  };

  const cancelInlineColumnEdit = () => {
    setEditingColumnInline(null);
  };

  const handleSaveInlineColumnEdit = async () => {
    if (!editingColumnInline) return;

    const section = sections.find((item) => item.id === editingColumnInline.sectionId);
    if (!section) {
      setEditingColumnInline(null);
      return;
    }

    const nextName = editingColumnInline.name.trim();
    if (!nextName) {
      alert('O nome da coluna nao pode ficar vazio.');
      return;
    }

    const baseMeta = sectionMetaById[section.id] || DEFAULT_SECTION_META;
    const currentColumns = normalizeTaskColumns(baseMeta.taskColumns);
    const existingColumn = currentColumns.find((item) => item.id === editingColumnInline.columnId);

    if (!existingColumn || existingColumn.name === nextName) {
      setEditingColumnInline(null);
      return;
    }

    const nextColumns = currentColumns.map((item) =>
      item.id === editingColumnInline.columnId ? { ...item, name: nextName } : item,
    );

    try {
      await saveSectionTaskColumns(section, nextColumns);
      setEditingColumnInline(null);
    } catch (renameColumnError) {
      console.error('Erro ao atualizar nome da coluna:', renameColumnError);
      alert('Erro ao atualizar nome da coluna. Tente novamente.');
    }
  };

  const handleDuplicateColumn = async (section, column) => {
    try {
      const baseMeta = sectionMetaById[section.id] || DEFAULT_SECTION_META;
      const currentColumns = normalizeTaskColumns(baseMeta.taskColumns);
      const existingNames = new Set(currentColumns.map((item) => item.name.trim().toLowerCase()));

      let nextName = `${column.name} (copia)`;
      let suffix = 2;
      while (existingNames.has(nextName.toLowerCase())) {
        nextName = `${column.name} (copia ${suffix})`;
        suffix += 1;
      }

      const duplicatedColumn = {
        id: `col_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
        name: nextName,
        type: column.type,
      };

      const originalIndex = currentColumns.findIndex((item) => item.id === column.id);
      const nextColumns = [...currentColumns];
      if (originalIndex === -1) {
        nextColumns.push(duplicatedColumn);
      } else {
        nextColumns.splice(originalIndex + 1, 0, duplicatedColumn);
      }

      await saveSectionTaskColumns(section, nextColumns);
      setColumnActionsMenu(null);
    } catch (duplicateError) {
      console.error('Erro ao duplicar coluna:', duplicateError);
      alert('Erro ao duplicar coluna. Tente novamente.');
    }
  };

  const handleOpenDeleteColumnModal = (section, column) => {
    setColumnActionsMenu(null);
    setDeletingColumnTarget({
      sectionId: section.id,
      sectionName: section.name,
      columnId: column.id,
      columnName: column.name,
    });
  };

  const handleDeleteColumn = async (section, column) => {
    try {
      const baseMeta = sectionMetaById[section.id] || DEFAULT_SECTION_META;
      const currentColumns = normalizeTaskColumns(baseMeta.taskColumns);
      const nextColumns = currentColumns.filter((item) => item.id !== column.id);
      await saveSectionTaskColumns(section, nextColumns);
      setColumnWidthsBySection((prev) => {
        const sectionWidths = prev[section.id];
        if (!sectionWidths || !(column.id in sectionWidths)) return prev;

        const nextSectionWidths = { ...sectionWidths };
        delete nextSectionWidths[column.id];

        const next = { ...prev };
        if (Object.keys(nextSectionWidths).length === 0) {
          delete next[section.id];
        } else {
          next[section.id] = nextSectionWidths;
        }
        return next;
      });
      setColumnActionsMenu(null);
      setEditingColumnInline((prev) =>
        prev?.sectionId === section.id && prev?.columnId === column.id ? null : prev,
      );
    } catch (deleteError) {
      console.error('Erro ao excluir coluna:', deleteError);
      alert('Erro ao excluir coluna. Tente novamente.');
    }
  };

  const handleDeleteColumnConfirmed = async () => {
    if (!deletingColumnTarget) return;

    const section = sections.find((item) => item.id === deletingColumnTarget.sectionId);
    if (!section) {
      setDeletingColumnTarget(null);
      return;
    }

    const column = (sectionMetaById[section.id]?.taskColumns || []).find(
      (item) => item.id === deletingColumnTarget.columnId,
    );
    if (!column) {
      setDeletingColumnTarget(null);
      return;
    }

    await handleDeleteColumn(section, column);
    setDeletingColumnTarget(null);
  };

  const handleOpenDeleteModal = (section) => {
    setDeletingSection(section);
    setShowDeleteSectionModal(true);
  };

  const handleDeleteSection = async () => {
    if (!deletingSection) return;

    try {
      await sectionService.deleteSection(deletingSection.id);
      setSections((prev) => prev.filter((item) => item.id !== deletingSection.id));
      setTasks((prev) => {
        const next = { ...prev };
        delete next[deletingSection.id];
        return next;
      });
      setSelectedTasks((prev) => {
        if (!prev[deletingSection.id]) return prev;
        const next = { ...prev };
        delete next[deletingSection.id];
        return next;
      });
      setColumnTypeMenu((prev) => (prev?.sectionId === deletingSection.id ? null : prev));
      setColumnActionsMenu((prev) => (prev?.sectionId === deletingSection.id ? null : prev));
      setEditingColumnInline((prev) => (prev?.sectionId === deletingSection.id ? null : prev));
      setDeletingColumnTarget((prev) => (prev?.sectionId === deletingSection.id ? null : prev));
      setColumnWidthsBySection((prev) => {
        if (!(deletingSection.id in prev)) return prev;
        const next = { ...prev };
        delete next[deletingSection.id];
        return next;
      });
      setInlineTaskDraftBySection((prev) => {
        if (!(deletingSection.id in prev)) return prev;
        const next = { ...prev };
        delete next[deletingSection.id];
        return next;
      });
      setCreatingInlineTaskBySection((prev) => {
        if (!(deletingSection.id in prev)) return prev;
        const next = { ...prev };
        delete next[deletingSection.id];
        return next;
      });
      setDeletingSection(null);
      setShowDeleteSectionModal(false);
    } catch (deleteError) {
      console.error('Erro ao excluir secao:', deleteError);
      alert('Erro ao excluir secao. Tente novamente.');
    }
  };

  const handleTaskSectionChange = (sectionId) => {
    setNewTask((prev) => ({
      ...prev,
      sectionId,
      fields: initTaskFieldsForSection(sectionId, prev.fields),
    }));
  };

  const handleTaskFieldChange = (columnId, value) => {
    setNewTask((prev) => ({
      ...prev,
      fields: {
        ...prev.fields,
        [columnId]: value,
      },
    }));
  };

  const handleCreateTask = async () => {
    if (!newTask.title.trim() || !newTask.sectionId) return;

    try {
      const current = tasks[newTask.sectionId] || [];
      const descriptionPayload = serializeTaskPayload({
        notes: newTask.description,
        fields: newTask.fields,
      });
      const created = await taskService.createTask({
        title: newTask.title.trim(),
        description: descriptionPayload,
        section_id: newTask.sectionId,
        order_index: current.length,
      });

      setTasks((prev) => ({
        ...prev,
        [newTask.sectionId]: [
          ...(prev[newTask.sectionId] || []),
          {
            ...attachTaskPayload(created),
            section_id: newTask.sectionId,
            order_index: current.length,
          },
        ],
      }));

      setNewTask({ title: '', description: '', sectionId: '', fields: {} });
      setShowTaskModal(false);
    } catch (createError) {
      console.error('Erro ao criar tarefa:', createError);
      alert('Erro ao criar tarefa. Tente novamente.');
    }
  };

  const handleInlineTaskDraftChange = (sectionId, value) => {
    setInlineTaskDraftBySection((prev) => ({
      ...prev,
      [sectionId]: value,
    }));
  };

  const handleInlineTaskCreate = async (sectionId) => {
    const rawTitle = inlineTaskDraftBySection[sectionId] || '';
    const trimmedTitle = rawTitle.trim();

    if (!trimmedTitle) {
      if (rawTitle) {
        setInlineTaskDraftBySection((prev) => ({
          ...prev,
          [sectionId]: '',
        }));
      }
      return;
    }

    if (creatingInlineTaskBySection[sectionId]) return;

    setCreatingInlineTaskBySection((prev) => ({
      ...prev,
      [sectionId]: true,
    }));

    try {
      const current = tasks[sectionId] || [];
      const created = await taskService.createTask({
        title: trimmedTitle,
        description: null,
        section_id: sectionId,
        order_index: current.length,
      });

      setTasks((prev) => ({
        ...prev,
        [sectionId]: [
          ...(prev[sectionId] || []),
          {
            ...attachTaskPayload(created),
            section_id: sectionId,
            order_index: current.length,
          },
        ],
      }));

      setInlineTaskDraftBySection((prev) => ({
        ...prev,
        [sectionId]: '',
      }));
    } catch (createError) {
      console.error('Erro ao criar tarefa inline:', createError);
      alert('Erro ao criar tarefa. Tente novamente.');
    } finally {
      setCreatingInlineTaskBySection((prev) => ({
        ...prev,
        [sectionId]: false,
      }));
    }
  };

  const handleDuplicateSelectedTasks = async () => {
    const grouped = getSelectedTasksGroupedBySection();
    if (Object.keys(grouped).length === 0) return;

    try {
      const createdBySection = {};

      for (const [sectionId, selectedInSection] of Object.entries(grouped)) {
        const existingSectionTasks = tasks[sectionId] || [];
        const created = await Promise.all(
          selectedInSection.map((task, index) =>
            taskService.createTask({
              title: task.title,
              description: task.description || null,
              section_id: sectionId,
              order_index: existingSectionTasks.length + index,
            }),
          ),
        );

        createdBySection[sectionId] = created.map((task, index) => ({
          ...attachTaskPayload(task),
          section_id: sectionId,
          order_index: existingSectionTasks.length + index,
        }));
      }

      setTasks((prev) => ({
        ...prev,
        ...Object.fromEntries(
          Object.entries(createdBySection).map(([sectionId, createdList]) => [
            sectionId,
            [...(prev[sectionId] || []), ...createdList],
          ]),
        ),
      }));

      clearTaskSelection();
    } catch (duplicateError) {
      console.error('Erro ao duplicar tarefas:', duplicateError);
      alert('Erro ao duplicar tarefas selecionadas. Tente novamente.');
    }
  };

  const handleDeleteSelectedTasks = async () => {
    const grouped = getSelectedTasksGroupedBySection();
    const entries = Object.entries(grouped);
    if (entries.length === 0) return;

    const count = entries.reduce((sum, [, selectedInSection]) => sum + selectedInSection.length, 0);
    if (!window.confirm(`Excluir ${count} tarefa(s) selecionada(s)?`)) {
      return;
    }

    try {
      await Promise.all(
        entries.flatMap(([, selectedInSection]) =>
          selectedInSection.map((task) => taskService.deleteTask(task.id)),
        ),
      );

      setTasks((prev) => {
        const next = { ...prev };
        entries.forEach(([sectionId, selectedInSection]) => {
          const idsToDelete = new Set(selectedInSection.map((task) => task.id));
          next[sectionId] = (prev[sectionId] || []).filter((task) => !idsToDelete.has(task.id));
        });
        return next;
      });

      clearTaskSelection();
    } catch (deleteError) {
      console.error('Erro ao excluir tarefas selecionadas:', deleteError);
      alert('Erro ao excluir tarefas selecionadas. Tente novamente.');
    }
  };

  const handleEditTask = async (taskId, sectionId, newTitle) => {
    if (!newTitle.trim()) return;

    try {
      const updatedTask = await taskService.updateTask(taskId, { title: newTitle.trim() });
      setTasks((prev) => ({
        ...prev,
        [sectionId]: (prev[sectionId] || []).map((task) =>
          task.id === taskId
            ? attachTaskPayload({ ...task, ...updatedTask, title: newTitle.trim() })
            : task,
        ),
      }));
      setEditingTask(null);
      setEditedTaskName('');
    } catch (editError) {
      console.error('Erro ao editar tarefa:', editError);
      alert('Erro ao editar tarefa. Tente novamente.');
    }
  };

  const beginInlineSectionEdit = (section) => {
    setEditingSectionId(section.id);
    setEditingSectionName(section.name);
  };

  const saveInlineSectionEdit = async (section) => {
    const trimmed = editingSectionName.trim();
    if (!trimmed || trimmed === section.name) {
      setEditingSectionId(null);
      setEditingSectionName('');
      return;
    }

    try {
      const meta = sectionMetaById[section.id] || DEFAULT_SECTION_META;
      const updated = await sectionService.updateSection(section.id, {
        name: trimmed,
        description: serializeSectionMeta(meta),
      });
      setSections((prev) =>
        prev.map((item) => (item.id === section.id ? { ...item, ...updated, name: trimmed } : item)),
      );
      setEditingSectionId(null);
      setEditingSectionName('');
    } catch (updateError) {
      console.error('Erro ao atualizar secao:', updateError);
      alert('Erro ao atualizar secao. Tente novamente.');
    }
  };

  const persistTaskOrder = async (nextTasks, impactedSectionIds) => {
    const updates = [];

    impactedSectionIds.forEach((sectionId) => {
      const list = nextTasks[sectionId] || [];
      list.forEach((task, index) => {
        updates.push({
          id: task.id,
          section_id: sectionId,
          order_index: index,
        });
      });
    });

    await Promise.all(
      updates.map((item) =>
        taskService.updateTask(item.id, {
          section_id: item.section_id,
          order_index: item.order_index,
        }),
      ),
    );
  };

  const handleTaskDrop = async (toSectionId, toTaskId = null) => {
    if (!draggingTask) return;

    const fromSectionId = draggingTask.sectionId;
    const taskId = draggingTask.taskId;

    const sourceTasks = [...(tasks[fromSectionId] || [])];
    const movingTask = sourceTasks.find((task) => task.id === taskId);
    if (!movingTask) {
      setDraggingTask(null);
      setDragOverSectionId(null);
      return;
    }

    const sourceWithoutTask = sourceTasks.filter((task) => task.id !== taskId);
    const targetTasks =
      fromSectionId === toSectionId ? sourceWithoutTask : [...(tasks[toSectionId] || [])];

    const insertIndex =
      toTaskId === null
        ? targetTasks.length
        : Math.max(
            0,
            targetTasks.findIndex((task) => task.id === toTaskId),
          );

    targetTasks.splice(insertIndex, 0, {
      ...movingTask,
      section_id: toSectionId,
    });

    const reindexedSource = sourceWithoutTask.map((task, index) => ({
      ...task,
      section_id: fromSectionId,
      order_index: index,
    }));
    const reindexedTarget = targetTasks.map((task, index) => ({
      ...task,
      section_id: toSectionId,
      order_index: index,
    }));

    const previousTasks = tasks;
    const nextTasks = { ...tasks, [toSectionId]: reindexedTarget };
    if (fromSectionId !== toSectionId) {
      nextTasks[fromSectionId] = reindexedSource;
    } else {
      nextTasks[fromSectionId] = reindexedTarget;
    }

    setTasks(nextTasks);
    if (fromSectionId !== toSectionId) {
      setSelectedTasks((prev) => {
        if (!prev[fromSectionId]?.[taskId]) return prev;

        const nextFromSelection = { ...(prev[fromSectionId] || {}) };
        delete nextFromSelection[taskId];

        const next = { ...prev };
        if (Object.keys(nextFromSelection).length === 0) {
          delete next[fromSectionId];
        } else {
          next[fromSectionId] = nextFromSelection;
        }

        next[toSectionId] = {
          ...(next[toSectionId] || {}),
          [taskId]: true,
        };

        return next;
      });
    }
    setDraggingTask(null);
    setDragOverSectionId(null);

    try {
      await persistTaskOrder(
        nextTasks,
        fromSectionId === toSectionId ? [toSectionId] : [fromSectionId, toSectionId],
      );
    } catch (dropError) {
      console.error('Erro ao mover tarefa:', dropError);
      setTasks(previousTasks);
      alert('Nao foi possivel mover a tarefa. Tente novamente.');
    }
  };

  const getColumnTypeLabel = (type) =>
    COLUMN_TYPES.find((item) => item.value === type)?.label || 'Personalizado';

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Carregando area de trabalho...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-message">{error}</div>
        <button type="button" className="btn btn-primary" onClick={() => navigate('/')}>
          Voltar para Home
        </button>
      </div>
    );
  }

  if (!workArea) {
    return (
      <div className="not-found-container">
        <h2>Area de trabalho nao encontrada</h2>
        <button type="button" className="btn btn-primary" onClick={() => navigate('/')}>
          Voltar para Home
        </button>
      </div>
    );
  }

  return (
    <div className="work-area-container">
      {sections.length === 0 ? (
        <div className="empty-state">
          <i className="fas fa-inbox fa-3x"></i>
          <h3>Nenhuma secao criada</h3>
          <p>Crie sua primeira coluna para comecar a organizar tarefas.</p>
          <button type="button" className="btn btn-primary" onClick={() => setShowSectionModal(true)}>
            <i className="fas fa-plus"></i> Criar Primeira Secao
          </button>
        </div>
      ) : (
        <div className="sections-grid">
          {sections.map((section) => {
            const sectionTasks = tasks[section.id] || [];
            const meta = sectionMetaById[section.id] || DEFAULT_SECTION_META;
            const sectionAllSelected = areAllSectionTasksSelected(section.id);

            return (
              <div
                key={section.id}
                className={`section-card ${dragOverSectionId === section.id ? 'drag-over' : ''}`}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragOverSectionId(section.id);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  handleTaskDrop(section.id);
                }}
                onDragLeave={() => {
                  setDragOverSectionId((prev) => (prev === section.id ? null : prev));
                }}
              >
                <div className="section-header">
                  <div
                    className="section-title-container"
                    onClick={() => {
                      if (editingSectionId === section.id) return;
                      beginInlineSectionEdit(section);
                    }}
                    title="Clique para editar nome da secao"
                  >
                    {editingSectionId === section.id ? (
                      <input
                        type="text"
                        value={editingSectionName}
                        className="section-title-input"
                        autoFocus
                        onChange={(event) => setEditingSectionName(event.target.value)}
                        onBlur={() => saveInlineSectionEdit(section)}
                        onKeyDown={(event) => {
                          event.stopPropagation();
                          if (event.key === 'Enter') saveInlineSectionEdit(section);
                          if (event.key === 'Escape') {
                            setEditingSectionId(null);
                            setEditingSectionName('');
                          }
                        }}
                      />
                    ) : (
                      <h3 className="section-title">
                        {section.name}
                      </h3>
                    )}

                    <div className="section-meta-row">
                      <span className="section-type-pill">{getColumnTypeLabel(meta.columnType)}</span>
                      {meta.topic ? <span className="section-topic-pill">{meta.topic}</span> : null}
                    </div>
                  </div>

                  <div className="section-action-icons">
                    <button
                      type="button"
                      className="btn-icon btn-delete"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleOpenDeleteModal(section);
                      }}
                      title="Excluir secao"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                </div>

                <div className="tasks-list">
                  {(() => {
                    const customColumns = getTaskColumnsForSection(section.id);

                    const renderAddColumnTrigger = () => (
                      <div className="column-add-menu-anchor">
                        <button
                          type="button"
                          className="btn-icon btn-column-inline-add"
                          onClick={(event) => {
                            toggleColumnTypeMenu(event, section.id);
                          }}
                          title="Adicionar coluna"
                        >
                          <i className="fas fa-plus"></i>
                        </button>
                      </div>
                    );

                    return (
                      <div className="tasks-table-wrap">
                        <table className="tasks-table">
                          <thead>
                            <tr>
                              <th className="tasks-th tasks-th-check">
                                <input
                                  type="checkbox"
                                  checked={sectionAllSelected}
                                  onChange={() => toggleSelectSectionTasks(section.id)}
                                  className="task-checkbox"
                                  title="Selecionar tarefas da secao"
                                />
                              </th>
                              <th
                                className={`tasks-th tasks-th-resizable ${resizingColumn?.sectionId === section.id && resizingColumn?.columnKey === PRIMARY_COLUMN_KEY ? 'is-resizing' : ''}`}
                                style={getColumnSizeStyle(section.id, PRIMARY_COLUMN_KEY, true)}
                              >
                                <div className="tasks-th-inline">
                                  <span>{getPrimaryColumnName(section.id)}</span>
                                </div>
                                <button
                                  type="button"
                                  className="column-resizer-handle"
                                  onMouseDown={(event) =>
                                    handleColumnResizeStart(event, section.id, PRIMARY_COLUMN_KEY, true)
                                  }
                                  aria-label="Redimensionar coluna principal"
                                  title="Arraste para ajustar largura"
                                />
                              </th>
                              {customColumns.map((column) => (
                                <th
                                  key={column.id}
                                  className={`tasks-th tasks-th-resizable ${resizingColumn?.sectionId === section.id && resizingColumn?.columnKey === column.id ? 'is-resizing' : ''}`}
                                  style={getColumnSizeStyle(section.id, column.id)}
                                >
                                  <div className="tasks-th-inline">
                                    <div
                                      className={`column-actions-menu-anchor ${columnActionsMenu?.sectionId === section.id && columnActionsMenu?.columnId === column.id ? 'menu-open' : ''}`}
                                    >
                                      {editingColumnInline?.sectionId === section.id &&
                                      editingColumnInline?.columnId === column.id ? (
                                        <input
                                          type="text"
                                          value={editingColumnInline.name}
                                          className="column-name-input"
                                          autoFocus
                                          onChange={(event) =>
                                            setEditingColumnInline((prev) =>
                                              prev ? { ...prev, name: event.target.value } : prev,
                                            )
                                          }
                                          onBlur={handleSaveInlineColumnEdit}
                                          onKeyDown={(event) => {
                                            if (event.key === 'Enter') {
                                              event.preventDefault();
                                              event.currentTarget.blur();
                                            }
                                            if (event.key === 'Escape') {
                                              event.preventDefault();
                                              cancelInlineColumnEdit();
                                            }
                                          }}
                                        />
                                      ) : (
                                        <>
                                          <span className="column-name-button" title={column.name}>
                                            {column.name}
                                          </span>
                                          <button
                                            type="button"
                                            className="column-settings-button"
                                            onClick={(event) => {
                                              toggleColumnActionsMenu(event, section.id, column.id);
                                            }}
                                            title="Opcoes da coluna"
                                          >
                                            <i className="fas fa-gear"></i>
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    className="column-resizer-handle"
                                    onMouseDown={(event) =>
                                      handleColumnResizeStart(event, section.id, column.id)
                                    }
                                    aria-label={`Redimensionar coluna ${column.name}`}
                                    title="Arraste para ajustar largura"
                                  />
                                </th>
                              ))}
                              <th className="tasks-th tasks-th-add-col">
                                {renderAddColumnTrigger()}
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {sectionTasks.length > 0 ? (
                              sectionTasks.map((task) => {
                                const payload = task._taskPayload || parseTaskPayload(task.description);
                                return (
                                  <tr
                                    key={task.id}
                                    draggable
                                    onDragStart={() => setDraggingTask({ taskId: task.id, sectionId: section.id })}
                                    onDragOver={(event) => event.preventDefault()}
                                    onDrop={(event) => {
                                      event.preventDefault();
                                      handleTaskDrop(section.id, task.id);
                                    }}
                                    className={`tasks-tr ${isTaskSelected(section.id, task.id) ? 'selected' : ''}`}
                                  >
                                    <td className="tasks-td tasks-td-check">
                                      <input
                                        type="checkbox"
                                        checked={isTaskSelected(section.id, task.id)}
                                        onChange={() => toggleTaskSelection(section.id, task.id)}
                                        className="task-checkbox"
                                      />
                                    </td>

                                    <td
                                      className="tasks-td"
                                      style={getColumnSizeStyle(section.id, PRIMARY_COLUMN_KEY, true)}
                                    >
                                      {editingTask === task.id ? (
                                        <input
                                          type="text"
                                          value={editedTaskName}
                                          onChange={(event) => setEditedTaskName(event.target.value)}
                                          onBlur={() => handleEditTask(task.id, section.id, editedTaskName)}
                                          onKeyDown={(event) => {
                                            if (event.key === 'Enter') {
                                              handleEditTask(task.id, section.id, editedTaskName);
                                            }
                                            if (event.key === 'Escape') {
                                              setEditingTask(null);
                                              setEditedTaskName('');
                                            }
                                          }}
                                          className="task-edit-input"
                                          autoFocus
                                        />
                                      ) : (
                                        <span
                                          className="task-title"
                                          onClick={() => {
                                            setEditingTask(task.id);
                                            setEditedTaskName(task.title);
                                          }}
                                          title="Clique para editar"
                                        >
                                          {task.title}
                                        </span>
                                      )}
                                    </td>

                                    {customColumns.map((column) => (
                                      <td
                                        key={column.id}
                                        className="tasks-td"
                                        style={getColumnSizeStyle(section.id, column.id)}
                                      >
                                        <span className="task-cell-value">
                                          {formatTaskFieldValue(payload.fields?.[column.id], column.type)}
                                        </span>
                                      </td>
                                    ))}
                                    <td className="tasks-td tasks-td-add-col"></td>
                                  </tr>
                                );
                              })
                            ) : null}

                            <tr className="tasks-tr-add">
                              <td className="tasks-td tasks-td-check"></td>
                              <td
                                className="tasks-td"
                                style={getColumnSizeStyle(section.id, PRIMARY_COLUMN_KEY, true)}
                              >
                                <input
                                  type="text"
                                  value={inlineTaskDraftBySection[section.id] || ''}
                                  onChange={(event) =>
                                    handleInlineTaskDraftChange(section.id, event.target.value)
                                  }
                                  onBlur={() => handleInlineTaskCreate(section.id)}
                                  onKeyDown={(event) => {
                                    if (event.key === 'Enter') {
                                      event.preventDefault();
                                      event.currentTarget.blur();
                                    }
                                    if (event.key === 'Escape') {
                                      event.preventDefault();
                                      setInlineTaskDraftBySection((prev) => ({
                                        ...prev,
                                        [section.id]: '',
                                      }));
                                      event.currentTarget.blur();
                                    }
                                  }}
                                  className="tasks-add-input"
                                  placeholder="Adicionar tarefa"
                                  disabled={creatingInlineTaskBySection[section.id]}
                                />
                              </td>
                              {customColumns.map((column) => (
                                <td
                                  key={column.id}
                                  className="tasks-td"
                                  style={getColumnSizeStyle(section.id, column.id)}
                                ></td>
                              ))}
                              <td className="tasks-td tasks-td-add-col"></td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </div>
              </div>
            );
          })}

          <button
            type="button"
            className="section-card section-card-create"
            onClick={() => setShowSectionModal(true)}
          >
            <span className="create-section-icon">
              <i className="fas fa-plus"></i>
            </span>
            <strong>Criar nova secao</strong>
            <span>Adicione outra coluna para organizar tarefas.</span>
          </button>
        </div>
      )}

      {totalSelectedTasks > 0 ? (
        <div className="bulk-actions-bar" role="region" aria-label="Acoes em massa das tarefas">
          <div className="bulk-actions-content">
            <div className="bulk-actions-info">
              <strong>{totalSelectedTasks}</strong>
              <span>{totalSelectedTasks === 1 ? ' tarefa selecionada' : ' tarefas selecionadas'}</span>
            </div>
            <div className="bulk-actions-controls">
              <button type="button" className="btn btn-outline btn-sm" onClick={toggleSelectAllTasks}>
                {allTasksSelected ? 'Desmarcar todas' : 'Selecionar todas'}
              </button>
              <button type="button" className="btn btn-outline btn-sm" onClick={handleDuplicateSelectedTasks}>
                <i className="fas fa-copy"></i> Duplicar
              </button>
              <button type="button" className="btn btn-danger btn-sm" onClick={handleDeleteSelectedTasks}>
                <i className="fas fa-trash"></i> Excluir
              </button>
              <button type="button" className="btn-icon" onClick={clearTaskSelection} title="Limpar selecao">
                <i className="fas fa-times"></i>
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {columnActionsMenu && activeColumnMenuContext ? (
        <div
          className="column-actions-popup column-actions-popup-floating"
          role="menu"
          style={{
            top: `${columnActionsMenu.top}px`,
            left: `${columnActionsMenu.left}px`,
          }}
        >
          <button
            type="button"
            className="column-actions-item"
            onClick={() =>
              handleEditColumn(activeColumnMenuContext.section, activeColumnMenuContext.column)
            }
          >
            <i className="fas fa-pen"></i> Editar coluna
          </button>
          <button
            type="button"
            className="column-actions-item"
            onClick={() =>
              handleDuplicateColumn(activeColumnMenuContext.section, activeColumnMenuContext.column)
            }
          >
            <i className="fas fa-copy"></i> Duplicar coluna
          </button>
          <button
            type="button"
            className="column-actions-item is-danger"
            onClick={() =>
              handleOpenDeleteColumnModal(activeColumnMenuContext.section, activeColumnMenuContext.column)
            }
          >
            <i className="fas fa-trash"></i> Excluir coluna
          </button>
        </div>
      ) : null}

      {deletingColumnTarget ? (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Excluir Coluna</h3>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setDeletingColumnTarget(null)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="warning-message">
                <i className="fas fa-exclamation-triangle fa-2x"></i>
                <p>
                  Tem certeza que deseja excluir a coluna
                  <strong> "{deletingColumnTarget.columnName}"</strong>?
                </p>
                <p className="warning-details">
                  <i className="fas fa-info-circle"></i>
                  Esta acao remove a coluna para toda a secao
                  <strong> "{deletingColumnTarget.sectionName}"</strong> e apaga os valores existentes nela.
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setDeletingColumnTarget(null)}
              >
                Cancelar
              </button>
              <button type="button" className="btn btn-danger" onClick={handleDeleteColumnConfirmed}>
                <i className="fas fa-trash"></i> Excluir coluna
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {columnTypeMenu && activeColumnTypeSection ? (
        <div
          className="column-type-popup column-type-popup-floating"
          role="menu"
          style={{
            top: `${columnTypeMenu.top}px`,
            left: `${columnTypeMenu.left}px`,
          }}
        >
          <div className="column-type-popup-title">Tipo de coluna</div>
          <div className="column-type-popup-grid">
            {TASK_FIELD_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                className="column-type-popup-item"
                onClick={() => handleCreateColumn(activeColumnTypeSection, type.value)}
              >
                <span className="column-type-popup-icon">
                  <i className={`fas ${type.icon}`}></i>
                </span>
                <span>{type.label}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            className="column-type-popup-cancel"
            onClick={() => setColumnTypeMenu(null)}
          >
            <i className="fas fa-times"></i> Cancelar
          </button>
        </div>
      ) : null}

      {showSectionModal ? (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Nova Secao</h3>
              <button
                type="button"
                className="btn-icon"
                onClick={() => {
                  setShowSectionModal(false);
                  setNewSectionName('');
                }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="sectionName">Nome da Secao</label>
                <input
                  id="sectionName"
                  type="text"
                  value={newSectionName}
                  onChange={(event) => setNewSectionName(event.target.value)}
                  placeholder="Ex: Sprint 03, Pendencias, Revisao Fiscal"
                  className="form-input"
                  autoFocus
                />
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  setShowSectionModal(false);
                  setNewSectionName('');
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleCreateSection}
                disabled={!newSectionName.trim()}
              >
                Criar Secao
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showDeleteSectionModal && deletingSection ? (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Confirmar Exclusao</h3>
              <button
                type="button"
                className="btn-icon"
                onClick={() => {
                  setShowDeleteSectionModal(false);
                  setDeletingSection(null);
                }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="warning-message">
                <i className="fas fa-exclamation-triangle fa-2x"></i>
                <p>
                  Tem certeza que deseja excluir a secao
                  <strong> "{deletingSection.name}"</strong>?
                </p>
                <p className="warning-details">
                  <i className="fas fa-info-circle"></i>
                  Todas as tarefas dentro desta secao tambem serao excluidas permanentemente.
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  setShowDeleteSectionModal(false);
                  setDeletingSection(null);
                }}
              >
                Cancelar
              </button>
              <button type="button" className="btn btn-danger" onClick={handleDeleteSection}>
                <i className="fas fa-trash"></i> Excluir Permanentemente
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showTaskModal ? (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Nova Tarefa</h3>
              <button type="button" className="btn-icon" onClick={() => setShowTaskModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="taskTitle">{getPrimaryColumnName(newTask.sectionId)} *</label>
                <input
                  id="taskTitle"
                  type="text"
                  value={newTask.title}
                  onChange={(event) => setNewTask((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="O que precisa ser feito?"
                  className="form-input"
                  autoFocus
                />
              </div>

              {getTaskColumnsForSection(newTask.sectionId).length > 0 ? (
                <div className="task-dynamic-fields-grid">
                  {getTaskColumnsForSection(newTask.sectionId).map((column) => (
                    <div key={column.id} className="form-group">
                      <label htmlFor={`task-col-${column.id}`}>{column.name}</label>
                      <input
                        id={`task-col-${column.id}`}
                        type={getInputTypeForField(column.type)}
                        value={newTask.fields[column.id] || ''}
                        onChange={(event) => handleTaskFieldChange(column.id, event.target.value)}
                        className="form-input"
                      />
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="form-group">
                <label htmlFor="taskDescription">Descricao (opcional)</label>
                <textarea
                  id="taskDescription"
                  value={newTask.description}
                  onChange={(event) => setNewTask((prev) => ({ ...prev, description: event.target.value }))}
                  placeholder="Detalhes adicionais..."
                  className="form-textarea"
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label>Secao *</label>
                <div className="section-chips">
                  {sections.map((section) => (
                    <button
                      key={section.id}
                      type="button"
                      className={`chip ${newTask.sectionId === section.id ? 'chip-selected' : ''}`}
                      onClick={() => handleTaskSectionChange(section.id)}
                    >
                      {section.name}
                      {newTask.sectionId === section.id ? <i className="fas fa-check chip-check"></i> : null}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={() => setShowTaskModal(false)}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleCreateTask}
                disabled={!newTask.title.trim() || !newTask.sectionId}
              >
                Criar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default WorkAreaPage;
