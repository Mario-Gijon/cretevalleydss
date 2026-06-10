import { issueMatchesSearch } from "./activeIssuesSearch";

const parseIssueDateDDMMYYYY = (value) => {
  if (!value || typeof value !== "string") return 0;

  const parts = value.includes("-") ? value.split("-") : value.split("/");
  const [dd, mm, yyyy] = parts.map((part) => Number(part));

  if (!dd || !mm || !yyyy) return 0;

  return new Date(yyyy, mm - 1, dd).getTime();
};

const sortActiveIssues = (issues, sortBy) => {
  const list = [...issues];

  const compareByName = (a, b) =>
    String(a?.name || "").localeCompare(String(b?.name || ""));

  const creationTimestamp = (issue) => {
    const fromCreatedAt = new Date(issue?.createdAt || 0).getTime();
    if (Number.isFinite(fromCreatedAt) && fromCreatedAt > 0) {
      return fromCreatedAt;
    }

    return parseIssueDateDDMMYYYY(issue?.creationDate);
  };

  const finalizationTimestamp = (issue) =>
    parseIssueDateDDMMYYYY(issue?.closureDate);

  if (sortBy === "creationDate") {
    list.sort((a, b) => {
      const diff = creationTimestamp(b) - creationTimestamp(a);
      if (diff !== 0) return diff;
      return compareByName(a, b);
    });
    return list;
  }

  if (sortBy === "deadlineDate") {
    const withDeadline = [];
    const withoutDeadline = [];

    list.forEach((issue) => {
      const timestamp = finalizationTimestamp(issue);
      if (timestamp > 0) {
        withDeadline.push({ issue, timestamp });
        return;
      }
      withoutDeadline.push(issue);
    });

    withDeadline.sort((a, b) => {
      const diff = a.timestamp - b.timestamp;
      if (diff !== 0) return diff;
      return compareByName(a.issue, b.issue);
    });

    withoutDeadline.sort(compareByName);

    return [
      ...withDeadline.map((entry) => entry.issue),
      ...withoutDeadline,
    ];
  }

  list.sort(compareByName);
  return list;
};

/**
 * Filtra y ordena la lista visible de issues activos.
 *
 * @param {Object} params Parametros de listado.
 * @param {Array} params.activeIssues Lista de issues activos.
 * @param {string} params.query Texto de busqueda.
 * @param {string} params.searchBy Campo de busqueda.
 * @param {string} params.sortBy Criterio de ordenacion.
 * @returns {Array}
 */
export const buildFilteredActiveIssues = ({
  activeIssues,
  query,
  searchBy,
  sortBy,
}) => {
  const filteredIssues = activeIssues.filter((issue) =>
    issueMatchesSearch(issue, query, searchBy)
  );

  return sortActiveIssues(filteredIssues, sortBy);
};

/**
 * Construye el fallback legacy de grupos de tareas.
 *
 * @param {Array} activeIssues Lista de issues activos.
 * @returns {Array}
 */
export const buildLegacyTaskGroups = (activeIssues) => {
  const groups = [
    {
      key: "evalAlt",
      title: "Evaluate alternatives",
      tone: "info",
      icon: null,
      match: (issue) => issue?.statusFlags?.canEvaluateAlternatives,
    },
    {
      key: "evalW",
      title: "Evaluate weights",
      tone: "info",
      icon: null,
      match: (issue) => issue?.statusFlags?.canEvaluateWeights,
    },
    {
      key: "computeW",
      title: "Compute weights (admin)",
      tone: "warning",
      icon: null,
      match: (issue) => issue?.isAdmin && issue?.statusFlags?.canComputeWeights,
    },
    {
      key: "resolve",
      title: "Resolve (admin)",
      tone: "warning",
      icon: null,
      match: (issue) => issue?.isAdmin && issue?.statusFlags?.canResolveIssue,
    },
  ];

  return groups
    .map((group) => ({ ...group, items: activeIssues.filter(group.match) }))
    .filter((group) => group.items.length > 0);
};

/**
 * Indica si el task center del servidor trae tareas utiles.
 *
 * @param {Object|null} taskCenter Task center recibido del servidor.
 * @returns {boolean}
 */
export const taskCenterHasTasks = (taskCenter) => {
  const sections = taskCenter?.sections;

  return (
    Array.isArray(sections) &&
    sections.some(
      (section) => Array.isArray(section?.items) && section.items.length > 0
    )
  );
};

/**
 * Devuelve el numero total de tareas visible.
 *
 * @param {Object} params Parametros de recuento.
 * @param {Array} params.taskGroupsLegacy Grupos legacy.
 * @param {Object|null} params.taskCenter Task center del servidor.
 * @returns {number}
 */
export const resolveTasksCount = ({ taskGroupsLegacy, taskCenter }) => {
  const legacyTotalTasks = taskGroupsLegacy.reduce(
    (accumulator, group) => accumulator + group.items.length,
    0
  );

  if (taskCenterHasTasks(taskCenter) && typeof taskCenter?.total === "number") {
    return taskCenter.total;
  }

  return legacyTotalTasks;
};

/**
 * Construye el resumen superior del dashboard de issues activos.
 *
 * @param {Object} params Parametros del resumen.
 * @param {Array} params.activeIssues Lista de issues activos.
 * @param {number} params.tasksCount Numero de tareas visibles.
 * @returns {Object}
 */
export const buildActiveIssuesOverview = ({ activeIssues, tasksCount }) => {
  const adminCount = activeIssues.filter((issue) => issue?.isAdmin).length;
  const readyResolve = activeIssues.filter(
    (issue) => issue?.statusFlags?.canResolveIssue
  ).length;

  return {
    total: activeIssues.length,
    tasks: tasksCount,
    admin: adminCount,
    readyResolve,
  };
};
