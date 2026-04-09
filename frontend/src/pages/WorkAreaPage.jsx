import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { authService } from '../services/auth';
import { sectionService } from '../services/sectionService';
import { taskService } from '../services/taskService';
import { workAreaService } from '../services/workAreaService';
import './WorkAreaPage.css';

const TASK_FIELD_TYPES = [
  { value: 'text', label: 'Texto', icon: 'fa-font', defaultName: 'Texto' },
  { value: 'number', label: 'Numero', icon: 'fa-hashtag', defaultName: 'Numero' },
  { value: 'date', label: 'Data', icon: 'fa-calendar-days', defaultName: 'Data' },
  { value: 'currency', label: 'Moeda', icon: 'fa-dollar-sign', defaultName: 'Moeda' },
  { value: 'select', label: 'Select', icon: 'fa-list', defaultName: 'Select' },
];

const DEFAULT_SELECT_OPTION_COLORS = [
  '#8AC6A9',
  '#48B2CC',
  '#EAD878',
  '#F6A500',
  '#94A4C7',
  '#B39DDB',
  '#93D4C6',
  '#E6C98F',
];

const createGeneratedId = (prefix) =>
  `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;

const createDefaultSelectOptions = () =>
  ['Opcao 1', 'Opcao 2', 'Opcao 3'].map((name, index) => ({
    id: `opt_default_${index + 1}`,
    name,
    color: DEFAULT_SELECT_OPTION_COLORS[index % DEFAULT_SELECT_OPTION_COLORS.length],
    linkSectionId: '',
  }));

const normalizeSelectOptions = (options, fallbackToDefault = true) => {
  const normalized = (Array.isArray(options) ? options : [])
    .map((option, index) => ({
      id: option?.id || createGeneratedId('opt'),
      name: (option?.name || '').trim() || `Opcao ${index + 1}`,
      color:
        typeof option?.color === 'string' && option.color.trim()
          ? option.color.trim()
          : DEFAULT_SELECT_OPTION_COLORS[index % DEFAULT_SELECT_OPTION_COLORS.length],
      linkSectionId: option?.linkSectionId || option?.link_section_id || '',
    }))
    .filter((option) => Boolean(option.name));

  if (normalized.length > 0) return normalized;
  return fallbackToDefault ? createDefaultSelectOptions() : [];
};

const DEFAULT_SECTION_META = {
  columnType: 'CUSTOM',
  topic: '',
  primaryColumnName: 'Tarefa',
  taskColumns: [],
};

const normalizePrimaryColumnName = (name) => {
  const raw = String(name || '').trim();
  if (!raw) return DEFAULT_SECTION_META.primaryColumnName;
  if (raw.toLowerCase() === 'nome da tarefa') return 'Tarefa';
  return raw;
};

const normalizeTaskColumns = (taskColumns) =>
  Array.isArray(taskColumns)
    ? taskColumns
        .map((column) => ({
          id: column.id || createGeneratedId('col'),
          name: column.name || 'Nova coluna',
          type: ['text', 'number', 'date', 'currency', 'select'].includes(column.type)
            ? column.type
            : 'text',
          options:
            column.type === 'select'
              ? normalizeSelectOptions(column.options, true)
              : undefined,
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
        primaryColumnName: normalizePrimaryColumnName(parsed.primaryColumnName),
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
    primaryColumnName: normalizePrimaryColumnName(meta.primaryColumnName),
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

const cloneSelectOptions = (options, regenerateIds = false) =>
  normalizeSelectOptions(options, true).map((option) => ({
    ...option,
    id: regenerateIds ? createGeneratedId('opt') : option.id,
  }));

const getSelectOptionByStoredValue = (column, storedValue) => {
  if (!column || column.type !== 'select') return null;
  const normalized = normalizeSelectOptions(column.options, true);
  const raw = String(storedValue || '').trim();
  if (!raw) return null;

  return (
    normalized.find((option) => option.id === raw) ||
    normalized.find((option) => option.name === raw) ||
    null
  );
};

const getSelectCellPresentation = (column, storedValue) => {
  const option = getSelectOptionByStoredValue(column, storedValue);
  if (!option) {
    if (!String(storedValue || '').trim()) {
      return { label: '-', color: null };
    }
    return { label: String(storedValue), color: null };
  }

  return {
    label: option.name,
    color: option.color,
  };
};

const parseLocaleNumericValue = (rawValue) => {
  const source = String(rawValue || '').trim();
  if (!source) return { valid: false };

  let sanitized = source.replace(/[^\d,.-]/g, '');
  if (!sanitized) return { valid: false };

  const isNegative = sanitized.includes('-');
  sanitized = sanitized.replace(/-/g, '');

  const lastComma = sanitized.lastIndexOf(',');
  const lastDot = sanitized.lastIndexOf('.');
  const decimalIndex = Math.max(lastComma, lastDot);

  const integerPartRaw = decimalIndex >= 0 ? sanitized.slice(0, decimalIndex) : sanitized;
  const decimalPartRaw = decimalIndex >= 0 ? sanitized.slice(decimalIndex + 1) : '';

  const integerDigits = integerPartRaw.replace(/[.,]/g, '');
  const decimalDigits = decimalPartRaw.replace(/[.,]/g, '');

  if (!integerDigits && !decimalDigits) return { valid: false };

  const normalized = `${isNegative ? '-' : ''}${integerDigits || '0'}${decimalDigits ? `.${decimalDigits}` : ''}`;
  const numeric = Number(normalized);
  if (!Number.isFinite(numeric)) return { valid: false };

  return { valid: true, value: numeric };
};

const formatCurrencyInputForTyping = (rawValue) => {
  const digitsOnly = String(rawValue || '').replace(/\D/g, '');
  if (!digitsOnly) return '';

  const normalizedDigits = digitsOnly.replace(/^0+(?=\d)/, '') || '0';
  const cents = normalizedDigits.slice(-2).padStart(2, '0');
  const integerDigits = normalizedDigits.length > 2 ? normalizedDigits.slice(0, -2) : '0';
  const integerNumber = Number(integerDigits);
  const integerFormatted = Number.isFinite(integerNumber)
    ? integerNumber.toLocaleString('pt-BR')
    : '0';

  return `${integerFormatted},${cents}`;
};

const sanitizeNumberInputForTyping = (rawValue) => {
  const source = String(rawValue || '');
  const stripped = source.replace(/[^\d,.-]/g, '');
  if (!stripped) return '';

  const negative = stripped.startsWith('-') ? '-' : '';
  return `${negative}${stripped.replace(/-/g, '')}`;
};

const formatTaskFieldValue = (value, type) => {
  if (value === null || value === undefined || String(value).trim() === '') return '-';
  if (type === 'date') {
    const normalizedDate = normalizeDateCandidateToIso(value);
    if (!normalizedDate.valid || !normalizedDate.value) return value;
    const [year, month, day] = normalizedDate.value.split('-');
    return `${day}/${month}/${year}`;
  }
  if (type === 'currency') {
    const parsed = parseLocaleNumericValue(value);
    if (parsed.valid) {
      return parsed.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }
    return value;
  }
  return value;
};

const getInputTypeForField = (fieldType) => {
  if (fieldType === 'number' || fieldType === 'currency') return 'text';
  if (fieldType === 'date') return 'date';
  return 'text';
};

const getInputModeForField = (fieldType) => {
  if (fieldType === 'number' || fieldType === 'currency') return 'decimal';
  if (fieldType === 'date') return 'numeric';
  return 'text';
};

const normalizeDateCandidateToIso = (rawValue) => {
  const source = String(rawValue || '').trim();
  if (!source) return { valid: true, value: '' };

  let year;
  let month;
  let day;

  const isoMatch = source.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const brMatch = source.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

  if (isoMatch) {
    year = Number(isoMatch[1]);
    month = Number(isoMatch[2]);
    day = Number(isoMatch[3]);
  } else if (brMatch) {
    day = Number(brMatch[1]);
    month = Number(brMatch[2]);
    year = Number(brMatch[3]);
  } else {
    return { valid: false };
  }

  const parsed = new Date(Date.UTC(year, month - 1, day));
  const isSameDate =
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day;

  if (!isSameDate) return { valid: false };

  const isoValue = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return { valid: true, value: isoValue };
};

const normalizeTaskFieldInputValue = (rawValue, fieldType) => {
  const asString = rawValue === null || rawValue === undefined ? '' : String(rawValue);
  const trimmed = asString.trim();

  if (!trimmed) {
    return { valid: true, normalizedValue: '' };
  }

  if (fieldType === 'text') {
    return { valid: true, normalizedValue: trimmed };
  }

  if (fieldType === 'number') {
    const parsed = parseLocaleNumericValue(trimmed);
    if (!parsed.valid) {
      return { valid: false, errorMessage: 'Essa coluna aceita apenas numeros.' };
    }
    return { valid: true, normalizedValue: String(parsed.value) };
  }

  if (fieldType === 'currency') {
    const parsed = parseLocaleNumericValue(trimmed);
    if (!parsed.valid) {
      return { valid: false, errorMessage: 'Essa coluna aceita apenas valores monetarios validos.' };
    }
    return { valid: true, normalizedValue: parsed.value.toFixed(2) };
  }

  if (fieldType === 'date') {
    const normalizedDate = normalizeDateCandidateToIso(trimmed);
    if (!normalizedDate.valid) {
      return {
        valid: false,
        errorMessage: 'Essa coluna aceita datas no formato DD/MM/AAAA ou AAAA-MM-DD.',
      };
    }
    return { valid: true, normalizedValue: normalizedDate.value };
  }

  return { valid: true, normalizedValue: trimmed };
};

const COLUMN_WIDTHS_STORAGE_KEY = 'miwanzo_column_widths_v2';
const TASK_SORT_STORAGE_KEY = 'miwanzo_task_sort_v1';
const PRIMARY_COLUMN_KEY = '__primary__';
const ESTIMATED_COLUMN_CHAR_WIDTH = 8;
const MIN_PRIMARY_WIDTH_FALLBACK = 120;
const MIN_CUSTOM_WIDTH_FALLBACK = 160;
const MAX_PRIMARY_WIDTH_FALLBACK = 260;
const MAX_CUSTOM_WIDTH_FALLBACK = 360;

const clampNumber = (value, min, max) => Math.min(Math.max(value, min), max);

const getNaturalColumnWidthByName = (columnName, isPrimaryColumn = false) => {
  const safeName = String(columnName || '').trim();
  const textWidth = Math.max(1, safeName.length) * ESTIMATED_COLUMN_CHAR_WIDTH;
  const basePadding = isPrimaryColumn ? 42 : 106;
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

const loadTaskSortFromStorage = () => {
  if (typeof window === 'undefined') return {};

  try {
    const stored = window.localStorage.getItem(TASK_SORT_STORAGE_KEY);
    if (!stored) return {};

    const parsed = JSON.parse(stored);
    if (!parsed || typeof parsed !== 'object') return {};

    return Object.entries(parsed).reduce((acc, [sectionId, rawSort]) => {
      if (!rawSort || typeof rawSort !== 'object') return acc;

      const key = typeof rawSort.key === 'string' ? rawSort.key : '';
      const direction = rawSort.direction === 'asc' || rawSort.direction === 'desc'
        ? rawSort.direction
        : '';
      const type = typeof rawSort.type === 'string' ? rawSort.type : 'text';

      if (!key || !direction) return acc;

      acc[sectionId] = {
        key,
        direction,
        type,
      };
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

const buildDuplicatedTaskTitle = (originalTitle, usedLowerTitles) => {
  const normalizedOriginal = String(originalTitle || '').trim() || 'Tarefa';
  const baseCandidate = `${normalizedOriginal} (copy)`;
  if (!usedLowerTitles.has(baseCandidate.toLowerCase())) {
    return baseCandidate;
  }

  let suffix = 2;
  let candidate = `${normalizedOriginal} (copy ${suffix})`;
  while (usedLowerTitles.has(candidate.toLowerCase())) {
    suffix += 1;
    candidate = `${normalizedOriginal} (copy ${suffix})`;
  }

  return candidate;
};

const normalizeSectionName = (value) => String(value || '').trim().replace(/\s+/g, ' ');
const normalizeSectionNameKey = (value) => normalizeSectionName(value).toLocaleLowerCase('pt-BR');

const hasSectionNameConflict = (sectionList, candidateName, excludedSectionId = null) => {
  const normalizedCandidateKey = normalizeSectionNameKey(candidateName);
  if (!normalizedCandidateKey) return false;

  return sectionList.some((section) => {
    if (excludedSectionId && section.id === excludedSectionId) return false;
    return normalizeSectionNameKey(section.name) === normalizedCandidateKey;
  });
};

const buildDuplicatedSectionName = (originalName, usedLowerNames) => {
  const normalizedOriginal = normalizeSectionName(originalName) || 'Secao';
  const baseCandidate = `${normalizedOriginal} (copy)`;
  if (!usedLowerNames.has(normalizeSectionNameKey(baseCandidate))) {
    return baseCandidate;
  }

  let suffix = 2;
  let candidate = `${normalizedOriginal} (copy ${suffix})`;
  while (usedLowerNames.has(normalizeSectionNameKey(candidate))) {
    suffix += 1;
    candidate = `${normalizedOriginal} (copy ${suffix})`;
  }

  return candidate;
};

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
  const [showDeleteTasksModal, setShowDeleteTasksModal] = useState(false);
  const [deletingColumnTarget, setDeletingColumnTarget] = useState(null);
  const [sectionActionsMenu, setSectionActionsMenu] = useState(null);

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

  const [draggingSection, setDraggingSection] = useState(null);
  const [dragOverSectionTargetId, setDragOverSectionTargetId] = useState(null);
  const [draggingTask, setDraggingTask] = useState(null);
  const [dragOverSectionId, setDragOverSectionId] = useState(null);
  const [draggingColumn, setDraggingColumn] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const [selectedTasks, setSelectedTasks] = useState({});
  const [columnTypeMenu, setColumnTypeMenu] = useState(null);
  const [columnActionsMenu, setColumnActionsMenu] = useState(null);
  const [selectFieldMenu, setSelectFieldMenu] = useState(null);
  const [selectColorMenu, setSelectColorMenu] = useState(null);
  const [selectLinkMenu, setSelectLinkMenu] = useState(null);
  const [editingSelectOption, setEditingSelectOption] = useState(null);
  const [creatingSelectOption, setCreatingSelectOption] = useState(false);
  const [newSelectOptionName, setNewSelectOptionName] = useState('');
  const [editingColumnInline, setEditingColumnInline] = useState(null);
  const [editingTaskField, setEditingTaskField] = useState(null);
  const [collapsedSections, setCollapsedSections] = useState({});
  const [inlineTaskDraftBySection, setInlineTaskDraftBySection] = useState({});
  const [creatingInlineTaskBySection, setCreatingInlineTaskBySection] = useState({});
  const [columnWidthsBySection, setColumnWidthsBySection] = useState(() =>
    loadColumnWidthsFromStorage(),
  );
  const [taskSortBySection, setTaskSortBySection] = useState(() =>
    loadTaskSortFromStorage(),
  );
  const [resizingColumn, setResizingColumn] = useState(null);

  const sectionMetaById = useMemo(() => {
    const map = {};
    sections.forEach((section) => {
      map[section.id] = getSectionMeta(section.description);
    });
    return map;
  }, [sections]);

  const normalizedNewSectionName = useMemo(
    () => normalizeSectionName(newSectionName),
    [newSectionName],
  );

  const isNewSectionNameDuplicated = useMemo(
    () => hasSectionNameConflict(sections, normalizedNewSectionName),
    [normalizedNewSectionName, sections],
  );

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

  const activeSectionMenuContext = useMemo(() => {
    if (!sectionActionsMenu) return null;
    return sections.find((item) => item.id === sectionActionsMenu.sectionId) || null;
  }, [sectionActionsMenu, sections]);

  const activeColumnTypeSection = useMemo(() => {
    if (!columnTypeMenu) return null;
    return sections.find((item) => item.id === columnTypeMenu.sectionId) || null;
  }, [columnTypeMenu, sections]);

  const activeSelectFieldContext = useMemo(() => {
    if (!selectFieldMenu) return null;
    const section = sections.find((item) => item.id === selectFieldMenu.sectionId);
    if (!section) return null;

    const task = (tasks[section.id] || []).find((item) => item.id === selectFieldMenu.taskId);
    if (!task) return null;

    const column = (sectionMetaById[section.id]?.taskColumns || []).find(
      (item) => item.id === selectFieldMenu.columnId,
    );
    if (!column || column.type !== 'select') return null;

    const payload = task._taskPayload || parseTaskPayload(task.description);
    const selectedValue = payload.fields?.[column.id] || '';
    return {
      section,
      task,
      column,
      payload,
      selectedValue,
      options: normalizeSelectOptions(column.options, true),
    };
  }, [sectionMetaById, sections, selectFieldMenu, tasks]);

  const getTaskColumnsForSection = (sectionId) => sectionMetaById[sectionId]?.taskColumns || [];

  const getPrimaryColumnName = (sectionId) =>
    normalizePrimaryColumnName(sectionMetaById[sectionId]?.primaryColumnName);

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

  const getTaskSortState = (sectionId, columnKey) => {
    const currentSort = taskSortBySection?.[sectionId];
    if (!currentSort || currentSort.key !== columnKey) return null;
    return currentSort.direction;
  };

  const toggleTaskSort = (sectionId, columnKey, columnType) => {
    setTaskSortBySection((prev) => {
      const currentSort = prev[sectionId];
      const nextDirection =
        currentSort?.key === columnKey && currentSort?.direction === 'asc'
          ? 'desc'
          : 'asc';

      return {
        ...prev,
        [sectionId]: {
          key: columnKey,
          direction: nextDirection,
          type: columnType || 'text',
        },
      };
    });
  };

  const getTaskComparableValue = (task, sortKey, sortType, selectColumn = null) => {
    if (sortKey === PRIMARY_COLUMN_KEY) {
      return (task.title || '').trim();
    }

    const payload = task._taskPayload || parseTaskPayload(task.description);
    const rawValue = payload.fields?.[sortKey] || '';
    const rawString = String(rawValue || '').trim();

    if (!rawString) return null;

    if (sortType === 'number' || sortType === 'currency') {
      const parsed = parseLocaleNumericValue(rawString);
      return parsed.valid ? parsed.value : null;
    }

    if (sortType === 'date') {
      const parsedDate = normalizeDateCandidateToIso(rawString);
      return parsedDate.valid ? parsedDate.value : null;
    }

    if (sortType === 'select') {
      const option = getSelectOptionByStoredValue(selectColumn, rawString);
      return (option?.name || rawString).trim();
    }

    return rawString;
  };

  const sortedTasksBySection = useMemo(() => {
    const map = {};

    sections.forEach((section) => {
      const sectionTasks = tasks[section.id] || [];
      const sortState = taskSortBySection?.[section.id];
      if (!sortState?.key || !sortState?.direction) {
        map[section.id] = sectionTasks;
        return;
      }

      const baseColumns = sectionMetaById[section.id]?.taskColumns || [];
      const sortColumn =
        sortState.key === PRIMARY_COLUMN_KEY
          ? null
          : baseColumns.find((column) => column.id === sortState.key) || null;

      if (sortState.key !== PRIMARY_COLUMN_KEY && !sortColumn) {
        map[section.id] = sectionTasks;
        return;
      }

      const sortType = sortColumn?.type || 'text';
      const directionFactor = sortState.direction === 'desc' ? -1 : 1;

      const sorted = [...sectionTasks].sort((a, b) => {
        const comparableA = getTaskComparableValue(a, sortState.key, sortType, sortColumn);
        const comparableB = getTaskComparableValue(b, sortState.key, sortType, sortColumn);

        const aIsEmpty =
          comparableA === null || comparableA === undefined || String(comparableA).trim() === '';
        const bIsEmpty =
          comparableB === null || comparableB === undefined || String(comparableB).trim() === '';

        if (aIsEmpty && !bIsEmpty) return 1;
        if (!aIsEmpty && bIsEmpty) return -1;

        if (!aIsEmpty && !bIsEmpty) {
          let baseComparison = 0;
          if (sortType === 'number' || sortType === 'currency') {
            baseComparison = Number(comparableA) - Number(comparableB);
          } else if (sortType === 'date') {
            baseComparison = String(comparableA).localeCompare(String(comparableB), 'pt-BR');
          } else {
            baseComparison = String(comparableA).localeCompare(String(comparableB), 'pt-BR', {
              sensitivity: 'base',
              numeric: true,
            });
          }

          if (baseComparison !== 0) return baseComparison * directionFactor;
        }

        const orderA = Number.isFinite(Number(a.order_index)) ? Number(a.order_index) : 0;
        const orderB = Number.isFinite(Number(b.order_index)) ? Number(b.order_index) : 0;
        if (orderA !== orderB) return orderA - orderB;

        return String(a.id || '').localeCompare(String(b.id || ''));
      });

      map[section.id] = sorted;
    });

    return map;
  }, [sectionMetaById, sections, taskSortBySection, tasks]);

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

  const handleOpenDeleteSelectedTasksModal = () => {
    if (totalSelectedTasks <= 0) return;
    setShowDeleteTasksModal(true);
  };

  const closeDeleteSelectedTasksModal = () => {
    setShowDeleteTasksModal(false);
  };

  const isTaskSelected = (sectionId, taskId) => Boolean(selectedTasks[sectionId]?.[taskId]);

  const areAllSectionTasksSelected = (sectionId) => {
    const sectionTasks = tasks[sectionId] || [];
    if (sectionTasks.length === 0) return false;
    return sectionTasks.every((task) => isTaskSelected(sectionId, task.id));
  };

  const isSectionCollapsed = (sectionId) => Boolean(collapsedSections[sectionId]);

  const toggleSectionCollapsed = (sectionId) => {
    setCollapsedSections((prev) => {
      if (prev[sectionId]) {
        const next = { ...prev };
        delete next[sectionId];
        return next;
      }

      return {
        ...prev,
        [sectionId]: true,
      };
    });
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
    const validSectionIds = new Set(sections.map((section) => section.id));
    setCollapsedSections((prev) => {
      const next = Object.entries(prev).reduce((acc, [sectionId, value]) => {
        if (value && validSectionIds.has(sectionId)) {
          acc[sectionId] = true;
        }
        return acc;
      }, {});

      return JSON.stringify(prev) === JSON.stringify(next) ? prev : next;
    });
  }, [sections]);

  useEffect(() => {
    if (!editingTaskField) return;

    const targetTaskExists = (tasks[editingTaskField.sectionId] || []).some(
      (task) => task.id === editingTaskField.taskId,
    );

    if (!targetTaskExists) {
      setEditingTaskField(null);
    }
  }, [editingTaskField, tasks]);

  useEffect(() => {
    if (selectFieldMenu && !activeSelectFieldContext) {
      setSelectFieldMenu(null);
      setSelectColorMenu(null);
      setSelectLinkMenu(null);
      setEditingSelectOption(null);
      setCreatingSelectOption(false);
      setNewSelectOptionName('');
    }
  }, [activeSelectFieldContext, selectFieldMenu]);

  useEffect(() => {
    if (showDeleteTasksModal && totalSelectedTasks === 0) {
      setShowDeleteTasksModal(false);
    }
  }, [showDeleteTasksModal, totalSelectedTasks]);

  useEffect(() => {
    if (
      !columnTypeMenu &&
      !columnActionsMenu &&
      !sectionActionsMenu &&
      !selectFieldMenu &&
      !selectColorMenu &&
      !selectLinkMenu
    ) {
      return undefined;
    }

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

      if (
        !event.target.closest('.section-actions-menu-anchor') &&
        !event.target.closest('.section-actions-popup-floating')
      ) {
        setSectionActionsMenu(null);
      }

      if (
        !event.target.closest('.task-cell-select') &&
        !event.target.closest('.select-options-popup-floating') &&
        !event.target.closest('.select-options-color-popup') &&
        !event.target.closest('.select-options-link-popup')
      ) {
        setSelectFieldMenu(null);
        setSelectColorMenu(null);
        setSelectLinkMenu(null);
        setEditingSelectOption(null);
        setCreatingSelectOption(false);
        setNewSelectOptionName('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [columnActionsMenu, columnTypeMenu, sectionActionsMenu, selectColorMenu, selectFieldMenu, selectLinkMenu]);

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
    if (typeof window === 'undefined') return;

    try {
      const hasSort = Object.values(taskSortBySection).some(
        (sortState) => sortState?.key && sortState?.direction,
      );

      if (!hasSort) {
        window.localStorage.removeItem(TASK_SORT_STORAGE_KEY);
        return;
      }

      window.localStorage.setItem(TASK_SORT_STORAGE_KEY, JSON.stringify(taskSortBySection));
    } catch (_error) {
      // ignore localStorage write errors
    }
  }, [taskSortBySection]);

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
    const normalizedSectionName = normalizeSectionName(newSectionName);
    if (!normalizedSectionName) return;
    if (hasSectionNameConflict(sections, normalizedSectionName)) {
      alert('Ja existe uma secao com esse nome nesta area de trabalho.');
      return;
    }

    try {
      const created = await sectionService.createSection({
        name: normalizedSectionName,
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
      alert(createError?.response?.data?.message || 'Erro ao criar secao. Tente novamente.');
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

  const clearSectionDragState = () => {
    setDraggingSection(null);
    setDragOverSectionTargetId(null);
  };

  const persistSectionOrder = async (orderedSections) => {
    await Promise.all(
      orderedSections.map((section, index) =>
        sectionService.updateSection(section.id, { order_index: index }),
      ),
    );
  };

  const handleSectionDragStart = (event, sectionId) => {
    if (editingSectionId === sectionId) {
      event.preventDefault();
      return;
    }

    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', sectionId);
    setDraggingSection({ sectionId });
    setDragOverSectionTargetId(null);
    setDragOverSectionId(null);
    setDraggingTask(null);
  };

  const handleSectionDragOver = (event, targetSectionId) => {
    if (!draggingSection) return;
    if (draggingSection.sectionId === targetSectionId) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDragOverSectionTargetId((prev) => (prev === targetSectionId ? prev : targetSectionId));
  };

  const handleSectionDrop = async (event, targetSectionId) => {
    event.preventDefault();
    if (!draggingSection) {
      clearSectionDragState();
      return;
    }

    const fromIndex = sections.findIndex((section) => section.id === draggingSection.sectionId);
    const toIndex = sections.findIndex((section) => section.id === targetSectionId);
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
      clearSectionDragState();
      return;
    }

    const previousSections = sections;
    const reordered = [...sections];
    const [movingSection] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, movingSection);

    const nextSections = reordered.map((section, index) => ({
      ...section,
      order_index: index,
    }));

    setSections(nextSections);
    clearSectionDragState();

    try {
      await persistSectionOrder(nextSections);
    } catch (reorderError) {
      console.error('Erro ao reordenar secoes:', reorderError);
      setSections(previousSections);
      alert('Nao foi possivel reordenar as secoes. Tente novamente.');
    }
  };

  const handleSectionDragEnd = () => {
    clearSectionDragState();
  };

  const clearColumnDragState = () => {
    setDraggingColumn(null);
    setDragOverColumn(null);
  };

  const handleColumnDragStart = (event, sectionId, columnId) => {
    if (
      editingColumnInline?.sectionId === sectionId &&
      editingColumnInline?.columnId === columnId
    ) {
      event.preventDefault();
      return;
    }

    const targetElement = event.target instanceof Element ? event.target : null;
    const blockedDragOrigin = targetElement?.closest(
      '.column-settings-button, .column-resizer-handle, .column-name-input, .column-sort-button',
    );
    if (blockedDragOrigin) {
      event.preventDefault();
      return;
    }

    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', columnId);
    setDraggingColumn({ sectionId, columnId });
    setDragOverColumn(null);
    setColumnTypeMenu(null);
    setColumnActionsMenu(null);
  };

  const handleColumnDragOver = (event, sectionId, targetColumnId) => {
    if (!draggingColumn || draggingColumn.sectionId !== sectionId) return;
    if (draggingColumn.columnId === targetColumnId) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';

    const rect = event.currentTarget.getBoundingClientRect();
    const position = event.clientX < rect.left + rect.width / 2 ? 'before' : 'after';

    setDragOverColumn((prev) => {
      if (
        prev?.sectionId === sectionId &&
        prev?.targetColumnId === targetColumnId &&
        prev?.position === position
      ) {
        return prev;
      }
      return { sectionId, targetColumnId, position };
    });
  };

  const handleColumnDrop = async (event, section, targetColumnId, fallbackPosition = 'before') => {
    event.preventDefault();
    if (!draggingColumn || draggingColumn.sectionId !== section.id) {
      clearColumnDragState();
      return;
    }

    const baseMeta = sectionMetaById[section.id] || DEFAULT_SECTION_META;
    const currentColumns = normalizeTaskColumns(baseMeta.taskColumns);
    const fromIndex = currentColumns.findIndex((item) => item.id === draggingColumn.columnId);
    const targetIndex = currentColumns.findIndex((item) => item.id === targetColumnId);
    if (fromIndex === -1 || targetIndex === -1) {
      clearColumnDragState();
      return;
    }

    const position =
      dragOverColumn?.sectionId === section.id && dragOverColumn?.targetColumnId === targetColumnId
        ? dragOverColumn.position
        : fallbackPosition;

    let insertIndex = targetIndex + (position === 'after' ? 1 : 0);
    if (fromIndex < insertIndex) {
      insertIndex -= 1;
    }

    if (insertIndex === fromIndex) {
      clearColumnDragState();
      return;
    }

    const nextColumns = [...currentColumns];
    const [movingColumn] = nextColumns.splice(fromIndex, 1);
    nextColumns.splice(insertIndex, 0, movingColumn);

    const unchanged = nextColumns.every((column, index) => column.id === currentColumns[index].id);
    if (unchanged) {
      clearColumnDragState();
      return;
    }

    try {
      await saveSectionTaskColumns(section, nextColumns);
    } catch (reorderError) {
      console.error('Erro ao reordenar colunas:', reorderError);
      alert('Erro ao reordenar colunas. Tente novamente.');
    } finally {
      clearColumnDragState();
    }
  };

  const handleColumnDropToEnd = async (event, section) => {
    event.preventDefault();
    if (!draggingColumn || draggingColumn.sectionId !== section.id) {
      clearColumnDragState();
      return;
    }

    const baseMeta = sectionMetaById[section.id] || DEFAULT_SECTION_META;
    const currentColumns = normalizeTaskColumns(baseMeta.taskColumns);
    const fromIndex = currentColumns.findIndex((item) => item.id === draggingColumn.columnId);
    if (fromIndex === -1 || fromIndex === currentColumns.length - 1) {
      clearColumnDragState();
      return;
    }

    const nextColumns = [...currentColumns];
    const [movingColumn] = nextColumns.splice(fromIndex, 1);
    nextColumns.push(movingColumn);

    try {
      await saveSectionTaskColumns(section, nextColumns);
    } catch (reorderError) {
      console.error('Erro ao mover coluna para o final:', reorderError);
      alert('Erro ao reordenar colunas. Tente novamente.');
    } finally {
      clearColumnDragState();
    }
  };

  const handleColumnDragEnd = () => {
    clearColumnDragState();
  };

  const handleCreateColumn = async (section, columnType) => {
    try {
      const baseMeta = sectionMetaById[section.id] || DEFAULT_SECTION_META;
      const currentColumns = normalizeTaskColumns(baseMeta.taskColumns);
      const newColumnName = getDefaultColumnNameByType(columnType, currentColumns);
      const newColumn = {
        id: createGeneratedId('col'),
        name: newColumnName,
        type: columnType,
        options: columnType === 'select' ? createDefaultSelectOptions() : undefined,
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
        id: createGeneratedId('col'),
        name: nextName,
        type: column.type,
        options:
          column.type === 'select'
            ? cloneSelectOptions(column.options, true)
            : undefined,
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
      setTaskSortBySection((prev) => {
        const currentSort = prev[section.id];
        if (!currentSort || currentSort.key !== column.id) return prev;

        const next = { ...prev };
        delete next[section.id];
        return next;
      });
      setSelectFieldMenu((prev) =>
        prev?.sectionId === section.id && prev?.columnId === column.id ? null : prev,
      );
      setSelectColorMenu(null);
      setSelectLinkMenu(null);
      setEditingSelectOption(null);
      setCreatingSelectOption(false);
      setNewSelectOptionName('');
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

  const updateSelectColumnOptions = async (sectionId, columnId, updateFn) => {
    const section = sections.find((item) => item.id === sectionId);
    if (!section) return null;

    const baseMeta = sectionMetaById[section.id] || DEFAULT_SECTION_META;
    const currentColumns = normalizeTaskColumns(baseMeta.taskColumns);
    const targetColumn = currentColumns.find((item) => item.id === columnId && item.type === 'select');
    if (!targetColumn) return null;

    const currentOptions = normalizeSelectOptions(targetColumn.options, true);
    const nextOptionsRaw = updateFn(currentOptions);
    const nextOptions = normalizeSelectOptions(nextOptionsRaw, true);

    const nextColumns = currentColumns.map((item) =>
      item.id === targetColumn.id
        ? {
            ...item,
            options: nextOptions,
          }
        : item,
    );

    if (JSON.stringify(nextColumns) === JSON.stringify(currentColumns)) {
      return targetColumn;
    }

    await saveSectionTaskColumns(section, nextColumns);
    return nextColumns.find((item) => item.id === targetColumn.id) || null;
  };

  const openSelectFieldMenu = (event, sectionId, taskId, columnId) => {
    event.stopPropagation();
    setEditingTaskField(null);
    setSelectColorMenu(null);
    setSelectLinkMenu(null);
    setEditingSelectOption(null);
    setCreatingSelectOption(false);
    setNewSelectOptionName('');

    const triggerRect = event.currentTarget.getBoundingClientRect();
    const popupWidthEstimate = 460;
    const popupHeightEstimate = 340;
    const left = Math.max(12, Math.min(triggerRect.left, window.innerWidth - popupWidthEstimate - 12));
    const top = Math.max(12, Math.min(triggerRect.bottom + 8, window.innerHeight - popupHeightEstimate - 12));

    setSelectFieldMenu((prev) => {
      const isSameCell =
        prev?.sectionId === sectionId &&
        prev?.taskId === taskId &&
        prev?.columnId === columnId;

      if (isSameCell) return null;

      return {
        sectionId,
        taskId,
        columnId,
        top,
        left,
      };
    });
  };

  const getNextSelectOptionName = (options) => {
    const existingNames = new Set((options || []).map((option) => option.name.trim().toLowerCase()));
    let nextIndex = 1;
    while (existingNames.has(`opcao ${nextIndex}`.toLowerCase())) {
      nextIndex += 1;
    }
    return `Opcao ${nextIndex}`;
  };

  const beginEditSelectOption = (option) => {
    setCreatingSelectOption(false);
    setNewSelectOptionName('');
    setEditingSelectOption({
      optionId: option.id,
      name: option.name,
    });
  };

  const saveEditedSelectOptionName = async () => {
    if (!activeSelectFieldContext || !editingSelectOption) return;

    const nextName = editingSelectOption.name.trim();
    if (!nextName) {
      alert('O nome da opcao nao pode ficar vazio.');
      return;
    }

    try {
      await updateSelectColumnOptions(
        activeSelectFieldContext.section.id,
        activeSelectFieldContext.column.id,
        (currentOptions) =>
          currentOptions.map((option) =>
            option.id === editingSelectOption.optionId ? { ...option, name: nextName } : option,
          ),
      );
      setEditingSelectOption(null);
    } catch (updateError) {
      console.error('Erro ao renomear opcao select:', updateError);
      alert('Erro ao atualizar opcao. Tente novamente.');
    }
  };

  const beginCreateSelectOption = () => {
    if (!activeSelectFieldContext) return;
    setEditingSelectOption(null);
    setCreatingSelectOption(true);
    setNewSelectOptionName(getNextSelectOptionName(activeSelectFieldContext.options));
  };

  const saveCreatedSelectOption = async () => {
    if (!activeSelectFieldContext || !creatingSelectOption) return;
    const nextName = newSelectOptionName.trim();
    if (!nextName) {
      alert('Informe um nome para a nova opcao.');
      return;
    }

    try {
      await updateSelectColumnOptions(
        activeSelectFieldContext.section.id,
        activeSelectFieldContext.column.id,
        (currentOptions) => [
          ...currentOptions,
          {
            id: createGeneratedId('opt'),
            name: nextName,
            color: DEFAULT_SELECT_OPTION_COLORS[currentOptions.length % DEFAULT_SELECT_OPTION_COLORS.length],
            linkSectionId: '',
          },
        ],
      );
      setCreatingSelectOption(false);
      setNewSelectOptionName('');
    } catch (createError) {
      console.error('Erro ao criar opcao select:', createError);
      alert('Erro ao criar opcao. Tente novamente.');
    }
  };

  const openSelectColorMenu = (event, optionId) => {
    event.stopPropagation();
    const triggerRect = event.currentTarget.getBoundingClientRect();
    const popupWidthEstimate = 260;
    const left = Math.max(12, Math.min(triggerRect.left - 10, window.innerWidth - popupWidthEstimate - 12));
    const top = triggerRect.bottom + 8;

    setSelectLinkMenu(null);
    setSelectColorMenu((prev) =>
      prev?.optionId === optionId
        ? null
        : {
            optionId,
            top,
            left,
          },
    );
  };

  const openSelectLinkMenu = (event, optionId) => {
    event.stopPropagation();
    const triggerRect = event.currentTarget.getBoundingClientRect();
    const popupWidthEstimate = 280;
    const left = Math.max(12, Math.min(triggerRect.left - 10, window.innerWidth - popupWidthEstimate - 12));
    const top = triggerRect.bottom + 8;

    setSelectColorMenu(null);
    setSelectLinkMenu((prev) =>
      prev?.optionId === optionId
        ? null
        : {
            optionId,
            top,
            left,
          },
    );
  };

  const handleSelectOptionColorChange = async (optionId, color) => {
    if (!activeSelectFieldContext) return;

    try {
      await updateSelectColumnOptions(
        activeSelectFieldContext.section.id,
        activeSelectFieldContext.column.id,
        (currentOptions) =>
          currentOptions.map((option) =>
            option.id === optionId ? { ...option, color } : option,
          ),
      );
      setSelectColorMenu(null);
    } catch (colorError) {
      console.error('Erro ao atualizar cor da opcao select:', colorError);
      alert('Erro ao atualizar cor da opcao.');
    }
  };

  const handleSelectOptionLinkChange = async (optionId, linkSectionId) => {
    if (!activeSelectFieldContext) return;

    try {
      await updateSelectColumnOptions(
        activeSelectFieldContext.section.id,
        activeSelectFieldContext.column.id,
        (currentOptions) =>
          currentOptions.map((option) =>
            option.id === optionId
              ? { ...option, linkSectionId: linkSectionId || '' }
              : option,
          ),
      );
      setSelectLinkMenu(null);
    } catch (linkError) {
      console.error('Erro ao atualizar vinculo da opcao select:', linkError);
      alert('Erro ao atualizar vinculo da opcao.');
    }
  };

  const handleSelectOptionApplyToTask = async (optionId) => {
    if (!activeSelectFieldContext) return;

    const {
      section: sourceSection,
      task: activeTask,
      column: sourceColumn,
      options,
    } = activeSelectFieldContext;
    const selectedOption = options.find((option) => option.id === optionId);
    if (!selectedOption) return;

    const sourceSectionTasks = tasks[sourceSection.id] || [];
    const sectionSelection = selectedTasks[sourceSection.id] || {};
    const selectedTasksInSection = sourceSectionTasks.filter((item) => sectionSelection[item.id]);
    const shouldApplyToSelectedTasks =
      Boolean(sectionSelection[activeTask.id]) && selectedTasksInSection.length > 0;
    const tasksToApply = shouldApplyToSelectedTasks
      ? selectedTasksInSection
      : sourceSectionTasks.filter((item) => item.id === activeTask.id);

    if (tasksToApply.length === 0) return;

    const sourceColumns = normalizeTaskColumns(sectionMetaById[sourceSection.id]?.taskColumns || []);
    const linkedSectionId = selectedOption.linkSectionId || '';

    if (!linkedSectionId || linkedSectionId === sourceSection.id) {
      try {
        const updatedEntries = await Promise.all(
          tasksToApply.map(async (taskItem) => {
            const payload = taskItem._taskPayload || parseTaskPayload(taskItem.description);
            const nextSourceFields = {
              ...(payload.fields || {}),
              [sourceColumn.id]: selectedOption.id,
            };
            const nextDescription = serializeTaskPayload({
              notes: payload.notes || '',
              fields: nextSourceFields,
            });

            const updatedTask = await taskService.updateTask(taskItem.id, {
              description: nextDescription,
            });

            return {
              taskId: taskItem.id,
              updatedTask,
              nextDescription,
            };
          }),
        );

        const updatesByTaskId = updatedEntries.reduce((acc, item) => {
          acc[item.taskId] = item;
          return acc;
        }, {});

        setTasks((prev) => ({
          ...prev,
          [sourceSection.id]: (prev[sourceSection.id] || []).map((item) =>
            updatesByTaskId[item.id]
              ? attachTaskPayload({
                  ...item,
                  ...updatesByTaskId[item.id].updatedTask,
                  description:
                    updatesByTaskId[item.id].updatedTask?.description ??
                    updatesByTaskId[item.id].nextDescription,
                })
              : item,
          ),
        }));
        setSelectFieldMenu(null);
        setSelectColorMenu(null);
        setSelectLinkMenu(null);
      } catch (updateError) {
        console.error('Erro ao aplicar opcao select:', updateError);
        alert('Erro ao atualizar tarefa.');
      }
      return;
    }

    const targetSection = sections.find((item) => item.id === linkedSectionId);
    if (!targetSection) {
      alert('A secao vinculada nao existe mais.');
      return;
    }

    try {
      let targetColumns = normalizeTaskColumns(sectionMetaById[targetSection.id]?.taskColumns || []);
      let targetColumnsChanged = false;
      const sourceToTargetColumnMap = {};

      sourceColumns.forEach((sourceColumnItem) => {
        const found = targetColumns.find(
          (targetColumnItem) =>
            targetColumnItem.type === sourceColumnItem.type &&
            targetColumnItem.name.trim().toLowerCase() === sourceColumnItem.name.trim().toLowerCase(),
        );

        if (found) {
          sourceToTargetColumnMap[sourceColumnItem.id] = found.id;
          return;
        }

        const createdColumn = {
          id: createGeneratedId('col'),
          name: sourceColumnItem.name,
          type: sourceColumnItem.type,
          options:
            sourceColumnItem.type === 'select'
              ? cloneSelectOptions(sourceColumnItem.options, true)
              : undefined,
        };
        targetColumns = [...targetColumns, createdColumn];
        targetColumnsChanged = true;
        sourceToTargetColumnMap[sourceColumnItem.id] = createdColumn.id;
      });

      const selectOptionIdMapBySourceColumn = {};
      sourceColumns
        .filter((sourceColumnItem) => sourceColumnItem.type === 'select')
        .forEach((sourceColumnItem) => {
          const targetColumnId = sourceToTargetColumnMap[sourceColumnItem.id];
          if (!targetColumnId) return;

          const targetColumnIndex = targetColumns.findIndex((item) => item.id === targetColumnId);
          if (targetColumnIndex === -1) return;

          const sourceOptions = normalizeSelectOptions(sourceColumnItem.options, true);
          const targetSelectColumn = targetColumns[targetColumnIndex];
          const currentTargetOptions = normalizeSelectOptions(targetSelectColumn.options, true);
          const nextTargetOptions = [...currentTargetOptions];
          let targetOptionsChanged = false;

          const optionIdMap = {};

          sourceOptions.forEach((sourceOption) => {
            const existingTargetIndex = nextTargetOptions.findIndex(
              (targetOption) => targetOption.name === sourceOption.name,
            );

            if (existingTargetIndex === -1) {
              const createdTargetOption = {
                id: createGeneratedId('opt'),
                name: sourceOption.name,
                color: sourceOption.color || DEFAULT_SELECT_OPTION_COLORS[0],
                linkSectionId: sourceOption.linkSectionId || '',
              };
              nextTargetOptions.push(createdTargetOption);
              optionIdMap[sourceOption.id] = createdTargetOption.id;
              targetOptionsChanged = true;
              return;
            }

            const currentTargetOption = nextTargetOptions[existingTargetIndex];
            const nextColor = sourceOption.color || currentTargetOption.color;
            const nextLinkSectionId = sourceOption.linkSectionId || '';
            optionIdMap[sourceOption.id] = currentTargetOption.id;

            if (
              currentTargetOption.color !== nextColor ||
              (currentTargetOption.linkSectionId || '') !== nextLinkSectionId
            ) {
              nextTargetOptions[existingTargetIndex] = {
                ...currentTargetOption,
                color: nextColor,
                linkSectionId: nextLinkSectionId,
              };
              targetOptionsChanged = true;
            }
          });

          selectOptionIdMapBySourceColumn[sourceColumnItem.id] = optionIdMap;

          if (targetOptionsChanged) {
            targetColumns[targetColumnIndex] = {
              ...targetSelectColumn,
              options: nextTargetOptions,
            };
            targetColumnsChanged = true;
          }
        });

      if (targetColumnsChanged) {
        await saveSectionTaskColumns(targetSection, targetColumns);
      }

      const sourceTaskIdsToMove = new Set(tasksToApply.map((item) => item.id));
      const targetBaseList = tasks[targetSection.id] || [];

      const movedTasks = await Promise.all(
        tasksToApply.map(async (taskItem, index) => {
          const payload = taskItem._taskPayload || parseTaskPayload(taskItem.description);
          const nextSourceFields = {
            ...(payload.fields || {}),
            [sourceColumn.id]: selectedOption.id,
          };
          const remappedFields = {};
          Object.entries(nextSourceFields).forEach(([sourceColumnId, rawValue]) => {
            const sourceColumnItem = sourceColumns.find((item) => item.id === sourceColumnId);
            const targetColumnId = sourceToTargetColumnMap[sourceColumnId];
            if (!sourceColumnItem || !targetColumnId) return;

            if (sourceColumnItem.type !== 'select') {
              remappedFields[targetColumnId] = rawValue;
              return;
            }

            const sourceOption = getSelectOptionByStoredValue(sourceColumnItem, rawValue);
            if (!sourceOption) {
              remappedFields[targetColumnId] = rawValue;
              return;
            }

            const mappedOptionId = selectOptionIdMapBySourceColumn[sourceColumnId]?.[sourceOption.id];
            if (mappedOptionId) {
              remappedFields[targetColumnId] = mappedOptionId;
              return;
            }

            const targetColumnIndex = targetColumns.findIndex((item) => item.id === targetColumnId);
            if (targetColumnIndex === -1) {
              remappedFields[targetColumnId] = rawValue;
              return;
            }

            const fallbackTargetOptions = normalizeSelectOptions(
              targetColumns[targetColumnIndex].options,
              true,
            );
            const fallbackTargetOption = fallbackTargetOptions.find(
              (targetOption) => targetOption.name === sourceOption.name,
            );
            remappedFields[targetColumnId] = fallbackTargetOption ? fallbackTargetOption.id : rawValue;
          });

          const nextDescription = serializeTaskPayload({
            notes: payload.notes || '',
            fields: remappedFields,
          });

          const targetOrderIndex = targetBaseList.length + index;
          const updatedTask = await taskService.updateTask(taskItem.id, {
            section_id: targetSection.id,
            order_index: targetOrderIndex,
            description: nextDescription,
          });

          return attachTaskPayload({
            ...taskItem,
            ...updatedTask,
            section_id: targetSection.id,
            order_index: targetOrderIndex,
            description: updatedTask?.description ?? nextDescription,
          });
        }),
      );

      const sourceList = sourceSectionTasks
        .filter((item) => !sourceTaskIdsToMove.has(item.id))
        .map((item, index) => ({ ...item, order_index: index }));
      const targetList = [
        ...targetBaseList,
        ...movedTasks,
      ];
      const nextTaskMap = {
        ...tasks,
        [sourceSection.id]: sourceList,
        [targetSection.id]: targetList,
      };

      setTasks(nextTaskMap);
      await persistTaskOrder(nextTaskMap, [sourceSection.id, targetSection.id]);

      setSelectedTasks((prev) => {
        const prevSourceSelection = prev[sourceSection.id] || {};
        const movedSelectedIds = tasksToApply
          .map((taskItem) => taskItem.id)
          .filter((taskId) => Boolean(prevSourceSelection[taskId]));
        if (movedSelectedIds.length === 0) return prev;

        const nextSourceSelection = { ...prevSourceSelection };
        movedSelectedIds.forEach((taskId) => {
          delete nextSourceSelection[taskId];
        });
        const next = { ...prev };

        if (Object.keys(nextSourceSelection).length === 0) {
          delete next[sourceSection.id];
        } else {
          next[sourceSection.id] = nextSourceSelection;
        }

        const nextTargetSelection = {
          ...(next[targetSection.id] || {}),
        };
        movedSelectedIds.forEach((taskId) => {
          nextTargetSelection[taskId] = true;
        });
        next[targetSection.id] = nextTargetSelection;
        return next;
      });

      setSelectFieldMenu(null);
      setSelectColorMenu(null);
      setSelectLinkMenu(null);
    } catch (transferError) {
      console.error('Erro ao transferir tarefa via select:', transferError);
      alert('Nao foi possivel aplicar essa opcao na tarefa.');
    }
  };

  const toggleSectionActionsMenu = (event, sectionId) => {
    event.stopPropagation();
    const triggerRect = event.currentTarget.getBoundingClientRect();
    const popupWidthEstimate = 200;
    const left = Math.max(12, Math.min(triggerRect.left - 8, window.innerWidth - popupWidthEstimate - 12));
    const top = triggerRect.bottom + 6;

    setSectionActionsMenu((prev) =>
      prev?.sectionId === sectionId ? null : { sectionId, top, left },
    );
  };

  const handleOpenDeleteModal = (section) => {
    setSectionActionsMenu(null);
    setDeletingSection(section);
    setShowDeleteSectionModal(true);
  };

  const handleDuplicateSection = async (section) => {
    try {
      const sourceMeta = sectionMetaById[section.id] || DEFAULT_SECTION_META;
      const normalizedMeta = {
        ...sourceMeta,
        taskColumns: normalizeTaskColumns(sourceMeta.taskColumns),
      };
      const existingNames = new Set(
        sections.map((item) => normalizeSectionNameKey(item.name)),
      );
      const duplicatedName = buildDuplicatedSectionName(section.name, existingNames);

      const createdSection = await sectionService.createSection({
        name: duplicatedName,
        work_area_id: workAreaId,
        description: serializeSectionMeta(normalizedMeta),
      });

      const sourceTasks = sortByOrder(tasks[section.id] || []);
      const duplicatedTaskResponses = await Promise.all(
        sourceTasks.map((task, index) =>
          taskService.createTask({
            title: task.title,
            description: task.description || null,
            section_id: createdSection.id,
            order_index: index,
          }),
        ),
      );

      const duplicatedTasks = duplicatedTaskResponses.map((task, index) => ({
        ...attachTaskPayload(task),
        section_id: createdSection.id,
        order_index: Number.isFinite(Number(task.order_index)) ? Number(task.order_index) : index,
      }));

      setSections((prev) =>
        sortByOrder([
          ...prev,
          {
            ...createdSection,
            description: createdSection.description || serializeSectionMeta(normalizedMeta),
          },
        ]),
      );
      setTasks((prev) => ({
        ...prev,
        [createdSection.id]: duplicatedTasks,
      }));
      setSectionActionsMenu(null);
    } catch (duplicateError) {
      console.error('Erro ao duplicar secao:', duplicateError);
      alert(duplicateError?.response?.data?.message || 'Erro ao duplicar secao. Tente novamente.');
    }
  };

  const handleNormalizeSectionWidths = (sourceSection) => {
    if (!sourceSection) return;

    const sourceColumns = [PRIMARY_COLUMN_KEY, ...getTaskColumnsForSection(sourceSection.id).map((column) => column.id)];
    if (sourceColumns.length === 0) return;

    setColumnWidthsBySection((prev) => {
      const next = { ...prev };

      sections.forEach((targetSection) => {
        if (targetSection.id === sourceSection.id) return;

        const targetColumns = [
          PRIMARY_COLUMN_KEY,
          ...getTaskColumnsForSection(targetSection.id).map((column) => column.id),
        ];

        const sharedColumnsCount = Math.min(sourceColumns.length, targetColumns.length);
        if (sharedColumnsCount <= 0) return;

        const currentTargetWidthMap = next[targetSection.id] || {};
        const targetWidthMap = { ...currentTargetWidthMap };

        for (let index = 0; index < sharedColumnsCount; index += 1) {
          const sourceColumnKey = sourceColumns[index];
          const targetColumnKey = targetColumns[index];
          const sourceIsPrimaryColumn = sourceColumnKey === PRIMARY_COLUMN_KEY;
          const sourceWidth = getColumnWidth(
            sourceSection.id,
            sourceColumnKey,
            sourceIsPrimaryColumn,
          );

          if (Number.isFinite(sourceWidth)) {
            targetWidthMap[targetColumnKey] = Math.max(48, Math.round(sourceWidth));
          }
        }

        next[targetSection.id] = targetWidthMap;
      });

      return next;
    });

    setSectionActionsMenu(null);
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
      setSectionActionsMenu((prev) => (prev?.sectionId === deletingSection.id ? null : prev));
      setDraggingSection((prev) => (prev?.sectionId === deletingSection.id ? null : prev));
      setDragOverSectionTargetId((prev) => (prev === deletingSection.id ? null : prev));
      setTaskSortBySection((prev) => {
        if (!prev[deletingSection.id]) return prev;
        const next = { ...prev };
        delete next[deletingSection.id];
        return next;
      });
      setDraggingColumn((prev) => (prev?.sectionId === deletingSection.id ? null : prev));
      setDragOverColumn((prev) => (prev?.sectionId === deletingSection.id ? null : prev));
      setSelectFieldMenu((prev) => (prev?.sectionId === deletingSection.id ? null : prev));
      setSelectColorMenu(null);
      setSelectLinkMenu(null);
      setEditingSelectOption(null);
      setCreatingSelectOption(false);
      setNewSelectOptionName('');
      setEditingColumnInline((prev) => (prev?.sectionId === deletingSection.id ? null : prev));
      setEditingTaskField((prev) => (prev?.sectionId === deletingSection.id ? null : prev));
      setCollapsedSections((prev) => {
        if (!(deletingSection.id in prev)) return prev;
        const next = { ...prev };
        delete next[deletingSection.id];
        return next;
      });
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
        const usedTitles = new Set(
          existingSectionTasks.map((task) => String(task.title || '').trim().toLowerCase()),
        );
        const duplicateBatch = selectedInSection.map((task) => {
          const duplicatedTitle = buildDuplicatedTaskTitle(task.title, usedTitles);
          usedTitles.add(duplicatedTitle.toLowerCase());
          return { task, duplicatedTitle };
        });

        const created = await Promise.all(
          duplicateBatch.map(({ task, duplicatedTitle }, index) =>
            taskService.createTask({
              title: duplicatedTitle,
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
    if (entries.length === 0) {
      setShowDeleteTasksModal(false);
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
      setShowDeleteTasksModal(false);
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

  const beginInlineTaskFieldEdit = (task, sectionId, column, payload) => {
    if (column.type === 'select') return;

    const rawFieldValue = payload?.fields?.[column.id] || '';
    const initialValue =
      column.type === 'date'
        ? normalizeDateCandidateToIso(rawFieldValue).value || ''
        : column.type === 'currency'
          ? formatCurrencyInputForTyping(rawFieldValue)
        : rawFieldValue;

    setEditingTaskField({
      taskId: task.id,
      sectionId,
      columnId: column.id,
      columnType: column.type,
      value: initialValue,
    });
  };

  const cancelInlineTaskFieldEdit = () => {
    setEditingTaskField(null);
  };

  const saveInlineTaskFieldEdit = async () => {
    if (!editingTaskField) return;

    const { sectionId, taskId, columnId, columnType, value } = editingTaskField;
    const targetTask = (tasks[sectionId] || []).find((task) => task.id === taskId);
    if (!targetTask) {
      setEditingTaskField(null);
      return;
    }

    const normalized = normalizeTaskFieldInputValue(value, columnType);
    if (!normalized.valid) {
      alert(normalized.errorMessage || 'Valor invalido para esta coluna.');
      return;
    }

    const payload = targetTask._taskPayload || parseTaskPayload(targetTask.description);
    const previousValue = payload.fields?.[columnId] || '';
    const nextValue = normalized.normalizedValue;

    if (String(previousValue) === String(nextValue)) {
      setEditingTaskField(null);
      return;
    }

    const nextFields = { ...(payload.fields || {}) };
    if (!nextValue) {
      delete nextFields[columnId];
    } else {
      nextFields[columnId] = nextValue;
    }

    const nextDescription = serializeTaskPayload({
      notes: payload.notes || '',
      fields: nextFields,
    });

    try {
      const updatedTask = await taskService.updateTask(taskId, { description: nextDescription });
      setTasks((prev) => ({
        ...prev,
        [sectionId]: (prev[sectionId] || []).map((task) =>
          task.id === taskId
            ? attachTaskPayload({
                ...task,
                ...updatedTask,
                description: updatedTask?.description ?? nextDescription,
              })
            : task,
        ),
      }));
      setEditingTaskField(null);
    } catch (updateError) {
      console.error('Erro ao atualizar valor da coluna:', updateError);
      alert('Erro ao atualizar valor da coluna. Tente novamente.');
    }
  };

  const beginInlineSectionEdit = (section) => {
    setEditingSectionId(section.id);
    setEditingSectionName(section.name);
  };

  const saveInlineSectionEdit = async (section) => {
    const normalizedName = normalizeSectionName(editingSectionName);
    const currentNormalizedName = normalizeSectionName(section.name);
    if (!normalizedName || normalizedName === currentNormalizedName) {
      setEditingSectionId(null);
      setEditingSectionName('');
      return;
    }

    if (hasSectionNameConflict(sections, normalizedName, section.id)) {
      alert('Ja existe uma secao com esse nome nesta area de trabalho.');
      return;
    }

    try {
      const meta = sectionMetaById[section.id] || DEFAULT_SECTION_META;
      const updated = await sectionService.updateSection(section.id, {
        name: normalizedName,
        description: serializeSectionMeta(meta),
      });
      setSections((prev) =>
        prev.map((item) =>
          item.id === section.id ? { ...item, ...updated, name: normalizedName } : item,
        ),
      );
      setEditingSectionId(null);
      setEditingSectionName('');
    } catch (updateError) {
      console.error('Erro ao atualizar secao:', updateError);
      alert(updateError?.response?.data?.message || 'Erro ao atualizar secao. Tente novamente.');
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
            const sectionTasks = sortedTasksBySection[section.id] || [];
            const meta = sectionMetaById[section.id] || DEFAULT_SECTION_META;
            const sectionAllSelected = areAllSectionTasksSelected(section.id);
            const sectionCollapsed = isSectionCollapsed(section.id);
            const primarySortDirection = getTaskSortState(section.id, PRIMARY_COLUMN_KEY);
            const canDragSection = editingSectionId !== section.id;
            const isDraggingThisSection = draggingSection?.sectionId === section.id;
            const isSectionDropTarget =
              !!draggingSection &&
              draggingSection.sectionId !== section.id &&
              dragOverSectionTargetId === section.id;

            return (
              <div
                key={section.id}
                className={`section-card ${dragOverSectionId === section.id ? 'drag-over' : ''} ${isSectionDropTarget ? 'section-drop-target' : ''} ${isDraggingThisSection ? 'section-is-dragging' : ''}`}
                onDragOver={(event) => {
                  if (draggingSection) {
                    handleSectionDragOver(event, section.id);
                    return;
                  }

                  event.preventDefault();
                  setDragOverSectionId(section.id);
                }}
                onDrop={(event) => {
                  if (draggingSection) {
                    handleSectionDrop(event, section.id);
                    return;
                  }

                  event.preventDefault();
                  handleTaskDrop(section.id);
                }}
                onDragLeave={() => {
                  if (draggingSection) {
                    setDragOverSectionTargetId((prev) => (prev === section.id ? null : prev));
                    return;
                  }

                  setDragOverSectionId((prev) => (prev === section.id ? null : prev));
                }}
              >
                <div className="section-header">
                  <div className="section-title-container">
                    <button
                      type="button"
                      className={`section-drag-handle ${canDragSection ? '' : 'is-disabled'}`}
                      draggable={canDragSection}
                      onMouseDown={(event) => event.stopPropagation()}
                      onClick={(event) => event.stopPropagation()}
                      onDragStart={(event) => handleSectionDragStart(event, section.id)}
                      onDragEnd={handleSectionDragEnd}
                      title={
                        canDragSection
                          ? 'Arraste para reordenar secao'
                          : 'Finalize a edicao para arrastar'
                      }
                      aria-label={`Arrastar secao ${section.name}`}
                    >
                      <i className="fas fa-grip-vertical"></i>
                    </button>

                    <div
                      className="section-title-content"
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

                      {meta.topic ? (
                        <div className="section-meta-row">
                          <span className="section-topic-pill">{meta.topic}</span>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="section-action-icons">
                    <button
                      type="button"
                      className="btn-icon btn-section-toggle"
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleSectionCollapsed(section.id);
                      }}
                      title={sectionCollapsed ? 'Expandir tarefas' : 'Recolher tarefas'}
                    >
                      <i className={`fas ${sectionCollapsed ? 'fa-chevron-down' : 'fa-chevron-up'}`}></i>
                    </button>
                    <div
                      className={`section-actions-menu-anchor ${
                        sectionActionsMenu?.sectionId === section.id ? 'menu-open' : ''
                      }`}
                    >
                      <button
                        type="button"
                        className="btn-icon btn-section-settings"
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleSectionActionsMenu(event, section.id);
                        }}
                        title="Opcoes da secao"
                      >
                        <i className="fas fa-gear"></i>
                      </button>
                    </div>
                  </div>
                </div>

                {!sectionCollapsed ? (
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
                                  <button
                                    type="button"
                                    className={`column-sort-button ${primarySortDirection ? 'is-sorted' : ''}`}
                                    onMouseDown={(event) => event.stopPropagation()}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      toggleTaskSort(section.id, PRIMARY_COLUMN_KEY, 'text');
                                    }}
                                    title={`Ordenar por ${getPrimaryColumnName(section.id)}`}
                                  >
                                    <span className="column-sort-label">{getPrimaryColumnName(section.id)}</span>
                                    <i
                                      className={`fas ${primarySortDirection === 'asc' ? 'fa-sort-up' : primarySortDirection === 'desc' ? 'fa-sort-down' : 'fa-sort'}`}
                                    ></i>
                                  </button>
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
                              {customColumns.map((column) => {
                                const canDragColumn = !(
                                  editingColumnInline?.sectionId === section.id &&
                                  editingColumnInline?.columnId === column.id
                                );
                                const isDraggingCurrentColumn =
                                  draggingColumn?.sectionId === section.id &&
                                  draggingColumn?.columnId === column.id;
                                const isColumnDropTarget =
                                  dragOverColumn?.sectionId === section.id &&
                                  dragOverColumn?.targetColumnId === column.id;
                                const dropMarkerClass = isColumnDropTarget
                                  ? dragOverColumn.position === 'before'
                                    ? 'column-drop-before'
                                    : 'column-drop-after'
                                  : '';
                                const columnSortDirection = getTaskSortState(section.id, column.id);

                                return (
                                  <th
                                    key={column.id}
                                    onDragOver={(event) =>
                                      handleColumnDragOver(event, section.id, column.id)
                                    }
                                    onDrop={(event) => handleColumnDrop(event, section, column.id)}
                                    className={`tasks-th tasks-th-resizable tasks-th-column ${resizingColumn?.sectionId === section.id && resizingColumn?.columnKey === column.id ? 'is-resizing' : ''} ${isDraggingCurrentColumn ? 'is-dragging' : ''} ${dropMarkerClass}`}
                                    style={getColumnSizeStyle(section.id, column.id)}
                                  >
                                    <div className="tasks-th-inline">
                                      <button
                                        type="button"
                                        className={`column-drag-handle ${canDragColumn ? '' : 'is-disabled'}`}
                                        draggable={canDragColumn}
                                        onMouseDown={(event) => event.stopPropagation()}
                                        onClick={(event) => event.stopPropagation()}
                                        onDragStart={(event) =>
                                          handleColumnDragStart(event, section.id, column.id)
                                        }
                                        onDragEnd={handleColumnDragEnd}
                                        title={
                                          canDragColumn
                                            ? 'Arraste para reordenar coluna'
                                            : 'Finalize a edicao para arrastar'
                                        }
                                        aria-label={`Arrastar coluna ${column.name}`}
                                      >
                                        <i className="fas fa-grip"></i>
                                      </button>
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
                                            <button
                                              type="button"
                                              className={`column-sort-button column-name-button ${columnSortDirection ? 'is-sorted' : ''}`}
                                              onMouseDown={(event) => event.stopPropagation()}
                                              onClick={(event) => {
                                                event.stopPropagation();
                                                toggleTaskSort(section.id, column.id, column.type);
                                              }}
                                              title={`Ordenar por ${column.name}`}
                                            >
                                              <span className="column-sort-label">{column.name}</span>
                                              <i
                                                className={`fas ${columnSortDirection === 'asc' ? 'fa-sort-up' : columnSortDirection === 'desc' ? 'fa-sort-down' : 'fa-sort'}`}
                                              ></i>
                                            </button>
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
                                );
                              })}
                              <th
                                className={`tasks-th tasks-th-add-col ${dragOverColumn?.sectionId === section.id && dragOverColumn?.targetColumnId === '__end__' ? 'column-drop-end' : ''}`}
                                onDragOver={(event) => {
                                  if (!draggingColumn || draggingColumn.sectionId !== section.id) return;
                                  event.preventDefault();
                                  event.dataTransfer.dropEffect = 'move';
                                  setDragOverColumn({
                                    sectionId: section.id,
                                    targetColumnId: '__end__',
                                    position: 'after',
                                  });
                                }}
                                onDrop={(event) => handleColumnDropToEnd(event, section)}
                              >
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
                                    draggable={!draggingSection}
                                    onDragStart={() => setDraggingTask({ taskId: task.id, sectionId: section.id })}
                                    onDragOver={(event) => {
                                      if (draggingSection) return;
                                      event.preventDefault();
                                    }}
                                    onDrop={(event) => {
                                      if (draggingSection) return;
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
                                        className={`tasks-td ${column.type === 'select' ? 'tasks-td-select' : ''}`}
                                        style={getColumnSizeStyle(section.id, column.id)}
                                      >
                                        {column.type !== 'select' &&
                                        editingTaskField?.sectionId === section.id &&
                                        editingTaskField?.taskId === task.id &&
                                        editingTaskField?.columnId === column.id ? (
                                          <input
                                            type={getInputTypeForField(column.type)}
                                            className="task-cell-input"
                                            value={editingTaskField.value}
                                            autoFocus
                                            inputMode={getInputModeForField(column.type)}
                                            onChange={(event) =>
                                              setEditingTaskField((prev) =>
                                                prev
                                                  ? {
                                                      ...prev,
                                                      value:
                                                        prev.columnType === 'currency'
                                                          ? formatCurrencyInputForTyping(event.target.value)
                                                          : prev.columnType === 'number'
                                                            ? sanitizeNumberInputForTyping(event.target.value)
                                                            : event.target.value,
                                                    }
                                                  : prev,
                                              )
                                            }
                                            onBlur={saveInlineTaskFieldEdit}
                                            onKeyDown={(event) => {
                                              if (event.key === 'Enter') {
                                                event.preventDefault();
                                                event.currentTarget.blur();
                                              }
                                              if (event.key === 'Escape') {
                                                event.preventDefault();
                                                cancelInlineTaskFieldEdit();
                                              }
                                            }}
                                          />
                                        ) : (
                                          column.type === 'select' ? (
                                            (() => {
                                              const selectCell = getSelectCellPresentation(
                                                column,
                                                payload.fields?.[column.id],
                                              );
                                              return (
                                                <span
                                                  className={`task-cell-value task-cell-select ${selectCell.color ? 'is-filled' : ''}`}
                                                  onClick={(event) =>
                                                    openSelectFieldMenu(event, section.id, task.id, column.id)
                                                  }
                                                  title="Selecionar opcao"
                                                  style={
                                                    selectCell.color
                                                      ? {
                                                          backgroundColor: selectCell.color,
                                                          color: '#1f2937',
                                                          fontWeight: 600,
                                                        }
                                                      : undefined
                                                  }
                                                >
                                                  {selectCell.label}
                                                </span>
                                              );
                                            })()
                                          ) : (
                                            <span
                                              className="task-cell-value task-cell-editable"
                                              onClick={() =>
                                                beginInlineTaskFieldEdit(task, section.id, column, payload)
                                              }
                                              title="Clique para editar"
                                            >
                                              {formatTaskFieldValue(payload.fields?.[column.id], column.type)}
                                            </span>
                                          )
                                        )}
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
                                className="tasks-td tasks-td-add-primary"
                                style={getColumnSizeStyle(section.id, PRIMARY_COLUMN_KEY, true)}
                              >
                                <div className="tasks-add-input-shell">
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
                                    placeholder="+ Adicionar tarefa"
                                    disabled={creatingInlineTaskBySection[section.id]}
                                  />
                                </div>
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
                ) : null}
              </div>
            );
          })}

          <button
            type="button"
            className="section-card section-card-create"
            onClick={() => setShowSectionModal(true)}
          >
            <span className="create-section-content">
              <span className="create-section-icon">
                <i className="fas fa-plus"></i>
              </span>
              <strong>Criar nova seção</strong>
            </span>
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
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={handleOpenDeleteSelectedTasksModal}
              >
                <i className="fas fa-trash"></i> Excluir
              </button>
              <button type="button" className="btn-icon" onClick={clearTaskSelection} title="Limpar selecao">
                <i className="fas fa-times"></i>
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {sectionActionsMenu && activeSectionMenuContext ? (
        <div
          className="section-actions-popup section-actions-popup-floating"
          role="menu"
          style={{
            top: `${sectionActionsMenu.top}px`,
            left: `${sectionActionsMenu.left}px`,
          }}
        >
          <button
            type="button"
            className="section-actions-item"
            onClick={() => handleNormalizeSectionWidths(activeSectionMenuContext)}
          >
            <i className="fas fa-ruler-horizontal"></i> Padronizar larguras
          </button>
          <button
            type="button"
            className="section-actions-item"
            onClick={() => handleDuplicateSection(activeSectionMenuContext)}
          >
            <i className="fas fa-copy"></i> Duplicar secao
          </button>
          <button
            type="button"
            className="section-actions-item is-danger"
            onClick={() => handleOpenDeleteModal(activeSectionMenuContext)}
          >
            <i className="fas fa-trash"></i> Excluir secao
          </button>
        </div>
      ) : null}

      {showDeleteTasksModal ? (
        <div className="modal-overlay" onClick={closeDeleteSelectedTasksModal}>
          <div className="modal task-delete-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3>Excluir Tarefas</h3>
              <button type="button" className="btn-icon" onClick={closeDeleteSelectedTasksModal}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body task-delete-modal-body">
              <div className="task-delete-modal-icon">
                <i className="fas fa-trash"></i>
              </div>
              <p className="task-delete-modal-title">
                {totalSelectedTasks === 1
                  ? 'Excluir 1 tarefa selecionada?'
                  : `Excluir ${totalSelectedTasks} tarefas selecionadas?`}
              </p>
              <p className="task-delete-modal-description">
                Esta acao e permanente e remove as tarefas selecionadas de todas as secoes.
              </p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={closeDeleteSelectedTasksModal}>
                Cancelar
              </button>
              <button type="button" className="btn btn-danger" onClick={handleDeleteSelectedTasks}>
                <i className="fas fa-trash"></i> Confirmar exclusao
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

      {selectFieldMenu && activeSelectFieldContext ? (
        <div
          className="select-options-popup select-options-popup-floating"
          style={{
            top: `${selectFieldMenu.top}px`,
            left: `${selectFieldMenu.left}px`,
          }}
        >
          <div className="select-options-popup-header">
            <div className="select-options-popup-title">
              <i className="fas fa-list"></i>
              <span>Selecionar opcao</span>
            </div>
            <button
              type="button"
              className="btn-icon"
              onClick={() => {
                setSelectFieldMenu(null);
                setSelectColorMenu(null);
                setSelectLinkMenu(null);
                setEditingSelectOption(null);
                setCreatingSelectOption(false);
                setNewSelectOptionName('');
              }}
            >
              <i className="fas fa-times"></i>
            </button>
          </div>

          <div className="select-options-grid">
            {activeSelectFieldContext.options.map((option) => {
              const isSelected = activeSelectFieldContext.selectedValue === option.id;
              const isEditing = editingSelectOption?.optionId === option.id;
              const linkedSectionName = sections.find((item) => item.id === option.linkSectionId)?.name || '';

              return (
                <div
                  key={option.id}
                  className={`select-option-card ${isSelected ? 'is-selected' : ''}`}
                  style={
                    option.color
                      ? {
                          borderColor: option.color,
                        }
                      : undefined
                  }
                >
                  <button
                    type="button"
                    className="select-option-main"
                    style={option.color ? { backgroundColor: option.color } : undefined}
                    onClick={() => {
                      if (isEditing) return;
                      handleSelectOptionApplyToTask(option.id);
                    }}
                    onDoubleClick={(event) => {
                      event.stopPropagation();
                      beginEditSelectOption(option);
                    }}
                  >
                    {isEditing ? (
                      <input
                        type="text"
                        className="select-option-name-input"
                        value={editingSelectOption.name}
                        autoFocus
                        onMouseDown={(event) => event.stopPropagation()}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) =>
                          setEditingSelectOption((prev) =>
                            prev ? { ...prev, name: event.target.value } : prev,
                          )
                        }
                        onBlur={saveEditedSelectOptionName}
                        onKeyDown={(event) => {
                          event.stopPropagation();
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            event.currentTarget.blur();
                          }
                          if (event.key === 'Escape') {
                            event.preventDefault();
                            setEditingSelectOption(null);
                          }
                        }}
                      />
                    ) : (
                      <>
                        <span className="select-option-dot"></span>
                        <span className="select-option-name">{option.name}</span>
                      </>
                    )}
                  </button>

                  <div className="select-option-actions">
                    <button
                      type="button"
                      className="btn-icon"
                      title="Renomear opcao"
                      onClick={(event) => {
                        event.stopPropagation();
                        beginEditSelectOption(option);
                      }}
                    >
                      <i className="fas fa-pen"></i>
                    </button>
                    <button
                      type="button"
                      className="btn-icon"
                      title="Escolher cor"
                      onClick={(event) => openSelectColorMenu(event, option.id)}
                    >
                      <i className="fas fa-fill-drip"></i>
                    </button>
                    <button
                      type="button"
                      className={`btn-icon ${option.linkSectionId ? 'is-linked' : ''}`}
                      title={linkedSectionName ? `Vinculado: ${linkedSectionName}` : 'Vincular a secao'}
                      onClick={(event) => openSelectLinkMenu(event, option.id)}
                    >
                      <i className="fas fa-link"></i>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="select-options-footer">
            {creatingSelectOption ? (
              <div className="select-options-create-row">
                <input
                  type="text"
                  value={newSelectOptionName}
                  className="select-option-name-input"
                  autoFocus
                  onChange={(event) => setNewSelectOptionName(event.target.value)}
                  onBlur={saveCreatedSelectOption}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      event.currentTarget.blur();
                    }
                    if (event.key === 'Escape') {
                      event.preventDefault();
                      setCreatingSelectOption(false);
                      setNewSelectOptionName('');
                    }
                  }}
                />
              </div>
            ) : (
              <button
                type="button"
                className="select-options-add-btn"
                onClick={beginCreateSelectOption}
              >
                <i className="fas fa-plus"></i> Adicionar nova opcao
              </button>
            )}
          </div>
        </div>
      ) : null}

      {selectColorMenu && activeSelectFieldContext ? (
        <div
          className="select-options-color-popup"
          style={{
            top: `${selectColorMenu.top}px`,
            left: `${selectColorMenu.left}px`,
          }}
        >
          <div className="select-popup-subtitle">Escolha uma cor</div>
          <div className="select-color-grid">
            {DEFAULT_SELECT_OPTION_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className="select-color-btn"
                style={{ backgroundColor: color }}
                onClick={() => handleSelectOptionColorChange(selectColorMenu.optionId, color)}
              ></button>
            ))}
          </div>
          <div className="select-color-custom">
            <span>Personalizada</span>
            <input
              type="color"
              onChange={(event) =>
                handleSelectOptionColorChange(selectColorMenu.optionId, event.target.value)
              }
            />
          </div>
        </div>
      ) : null}

      {selectLinkMenu && activeSelectFieldContext ? (
        <div
          className="select-options-link-popup"
          style={{
            top: `${selectLinkMenu.top}px`,
            left: `${selectLinkMenu.left}px`,
          }}
        >
          <div className="select-popup-subtitle">Vincular a secao</div>
          <button
            type="button"
            className="select-link-remove"
            onClick={() => handleSelectOptionLinkChange(selectLinkMenu.optionId, '')}
          >
            <i className="fas fa-unlink"></i> Remover vinculo
          </button>
          <div className="select-link-list">
            {sections.map((section) => {
              const activeOption = activeSelectFieldContext.options.find(
                (option) => option.id === selectLinkMenu.optionId,
              );
              const isLinked = activeOption?.linkSectionId === section.id;
              return (
                <button
                  key={section.id}
                  type="button"
                  className={`select-link-item ${isLinked ? 'is-linked' : ''}`}
                  onClick={() => handleSelectOptionLinkChange(selectLinkMenu.optionId, section.id)}
                >
                  <i className="fas fa-folder"></i>
                  <span className="select-link-label">{section.name}</span>
                  {isLinked ? <span className="select-link-tag">vinculado</span> : null}
                </button>
              );
            })}
          </div>
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
                {isNewSectionNameDuplicated ? (
                  <p className="form-field-error">Ja existe uma secao com esse nome nesta area de trabalho.</p>
                ) : null}
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
                disabled={!normalizedNewSectionName || isNewSectionNameDuplicated}
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
