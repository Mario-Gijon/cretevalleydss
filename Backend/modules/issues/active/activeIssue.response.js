import {
  ACTIVE_ACTION_META,
  ACTIVE_STAGE_META,
  ACTIVE_TASK_ACTION_KEYS,
} from "./activeIssue.meta.js";

const ACTIVE_ROLE_OPTIONS = [
  { value: "all", label: "All roles" },
  { value: "admin", label: "Admin" },
  { value: "expert", label: "Expert" },
  { value: "both", label: "Admin & Expert" },
  { value: "viewer", label: "Viewer" },
];

/**
 * Devuelve un objeto de tareas vacío para la UI de activos.
 *
 * @returns {Object}
 */
export const getEmptyTasksByType = () => ({
  resolveIssue: [],
  computeWeights: [],
  evaluateWeights: [],
  evaluateAlternatives: [],
  waitingAdmin: [],
});

/**
 * Incrementa un contador en un objeto acumulador.
 *
 * @param {Object.<string, number>} counters Objeto acumulador.
 * @param {string} key Clave a incrementar.
 * @returns {void}
 */
export const incrementCounter = (counters, key) => {
  counters[key] = (counters[key] || 0) + 1;
};

/**
 * Construye las opciones de stage para filtros de activos.
 *
 * @returns {Array<Object>}
 */
const buildStageOptions = () => [
  { value: "all", label: "All stages" },
  ...Object.values(ACTIVE_STAGE_META).map((stage) => ({
    value: stage.key,
    label: stage.label,
  })),
];

/**
 * Construye las opciones de acción para filtros de activos.
 *
 * @returns {Array<Object>}
 */
const buildActionOptions = () => [
  { value: "all", label: "All actions" },
  { value: "waitingExperts", label: "Waiting experts" },
  ...Object.values(ACTIVE_ACTION_META)
    .sort((a, b) => a.sortPriority - b.sortPriority)
    .map((action) => ({
      value: action.key,
      label: action.label,
    })),
  { value: "none", label: "No pending action" },
];

/**
 * Construye las opciones de orden para filtros de activos.
 *
 * @param {boolean} [includeSmart=false] Indica si se añade la opción Smart.
 * @returns {Array<Object>}
 */
const buildSortOptions = (includeSmart = false) => [
  ...(includeSmart ? [{ value: "smart", label: "Smart" }] : []),
  { value: "nameAsc", label: "Name (A→Z)" },
  { value: "nameDesc", label: "Name (Z→A)" },
  { value: "deadlineSoon", label: "Deadline (soonest)" },
];

/**
 * Ordena la colección de issues activos según prioridad de UI, deadline y nombre.
 *
 * @param {Array<Object>} issues Issues formateados.
 * @returns {void}
 */
export const sortActiveIssues = (issues) => {
  (issues || []).sort((a, b) => {
    const aPriority = a.ui?.sortPriority ?? 90;
    const bPriority = b.ui?.sortPriority ?? 90;
    if (aPriority !== bPriority) return aPriority - bPriority;

    const aDeadline = a.ui?.deadline?.hasDeadline
      ? a.ui.deadline.daysLeft
      : 999999;
    const bDeadline = b.ui?.deadline?.hasDeadline
      ? b.ui.deadline.daysLeft
      : 999999;
    if (aDeadline !== bDeadline) return aDeadline - bDeadline;

    return String(a.name).localeCompare(String(b.name));
  });
};

/**
 * Ordena las tareas agrupadas por tipo para el task center.
 *
 * @param {Object.<string, Array<Object>>} tasksByType Tareas agrupadas.
 * @returns {void}
 */
export const sortActiveTasksByType = (tasksByType) => {
  for (const actionKey of ACTIVE_TASK_ACTION_KEYS) {
    (tasksByType[actionKey] || []).sort((a, b) => {
      if (a.sortPriority !== b.sortPriority) {
        return a.sortPriority - b.sortPriority;
      }

      const aDeadline = a.deadline?.hasDeadline ? a.deadline.daysLeft : 999999;
      const bDeadline = b.deadline?.hasDeadline ? b.deadline.daysLeft : 999999;
      if (aDeadline !== bDeadline) return aDeadline - bDeadline;

      return String(a.issueName).localeCompare(String(b.issueName));
    });
  }
};

/**
 * Construye el task center a partir de las tareas agrupadas.
 *
 * @param {Object} tasksByType Tareas agrupadas.
 * @returns {Object}
 */
export const buildActiveTaskCenter = (tasksByType) => {
  const total = ACTIVE_TASK_ACTION_KEYS.reduce(
    (acc, key) => acc + (tasksByType[key]?.length || 0),
    0
  );

  const sections = Object.values(ACTIVE_ACTION_META)
    .filter((action) => ACTIVE_TASK_ACTION_KEYS.includes(action.key))
    .sort((a, b) => a.sortPriority - b.sortPriority)
    .map((action) => {
      const items = tasksByType[action.key] || [];

      return {
        key: action.key,
        title: action.label,
        role: action.role,
        severity: action.severity,
        sortPriority: action.sortPriority,
        count: items.length,
        items,
      };
    })
    .filter((section) => section.count > 0);

  return {
    total,
    sections,
  };
};

/**
 * Construye la metadata de filtros para la respuesta de activos.
 *
 * @param {object} params Parámetros de entrada.
 * @param {Object.<string, number>} [params.roleCounts={}] Conteos por rol.
 * @param {Object.<string, number>} [params.stageCounts={}] Conteos por stage.
 * @param {Object.<string, number>} [params.actionCounts={}] Conteos por acción.
 * @param {boolean} [params.includeSmartSortOption=false] Indica si se añade la opción Smart.
 * @param {boolean} [params.includeSortDefault=false] Indica si defaults incluye sort.
 * @returns {Object}
 */
export const buildActiveFiltersMeta = ({
  roleCounts = {},
  stageCounts = {},
  actionCounts = {},
  includeSmartSortOption = false,
  includeSortDefault = false,
} = {}) => ({
  defaults: {
    role: "all",
    stage: "all",
    action: "all",
    ...(includeSortDefault ? { sort: "smart" } : {}),
    q: "",
  },
  roleOptions: ACTIVE_ROLE_OPTIONS,
  stageOptions: buildStageOptions(),
  actionOptions: buildActionOptions(),
  sortOptions: buildSortOptions(includeSmartSortOption),
  counts: {
    roles: roleCounts,
    stages: stageCounts,
    actions: actionCounts,
  },
});

/**
 * Construye la metadata agregada de la respuesta de activos.
 *
 * @param {object} params Parámetros de entrada.
 * @param {Array<Object>} params.formattedIssues Issues ya formateados.
 * @param {Object} params.tasksByType Tareas agrupadas.
 * @returns {Object}
 */
export const buildActiveIssuesResponseMeta = ({
  formattedIssues,
  tasksByType,
}) => {
  const taskCenter = buildActiveTaskCenter(tasksByType);

  const roleCounts = {};
  const stageCounts = {};
  const actionCounts = {};

  for (const issue of formattedIssues || []) {
    incrementCounter(roleCounts, issue.role || "viewer");
    incrementCounter(stageCounts, issue.ui?.stage || issue.currentStage || "unknown");

    const actionKey = issue.ui?.statusKey || issue.nextAction?.key || "none";
    incrementCounter(actionCounts, actionKey);
  }

  return {
    tasks: {
      total: taskCenter.total,
      byType: tasksByType,
    },
    taskCenter,
    filtersMeta: buildActiveFiltersMeta({
      roleCounts,
      stageCounts,
      actionCounts,
      includeSmartSortOption: false,
      includeSortDefault: false,
    }),
  };
};

/**
 * Construye la respuesta vacía estándar para activos.
 *
 * Mantiene el mismo contrato actual de la API cuando no hay issues visibles.
 *
 * @returns {Object}
 */
export const buildEmptyActiveIssuesPayload = () => ({
  success: true,
  issues: [],
  tasks: {
    total: 0,
    byType: getEmptyTasksByType(),
  },
  taskCenter: {
    total: 0,
    sections: [],
  },
  filtersMeta: buildActiveFiltersMeta({
    roleCounts: {},
    stageCounts: {},
    actionCounts: {},
    includeSmartSortOption: true,
    includeSortDefault: true,
  }),
});
