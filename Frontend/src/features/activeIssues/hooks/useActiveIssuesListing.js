import { useMemo, useState } from "react";

import {
  adminContainsQuery,
  alternativesContainsQuery,
  criteriaContainsQuery,
  normalizeActiveIssueValue,
  parseIssueDateDDMMYYYY,
} from "../utils/activeIssues.filters";

/**
 * Gestiona la búsqueda, ordenación y métricas derivadas
 * de la pantalla de issues activos.
 *
 * Mantiene fuera de la page toda la lógica de listado
 * sin alterar el comportamiento visual actual.
 *
 * @param {Object} params Parámetros del hook.
 * @param {Array} params.activeIssues Lista de issues activos.
 * @param {Object|null} params.taskCenter Task center recibido del servidor.
 * @param {Object|null} params.filtersMeta Metadatos de filtros del servidor.
 * @returns {Object}
 */
export const useActiveIssuesListing = ({
  activeIssues = [],
  taskCenter = null,
  filtersMeta = null,
}) => {
  const [query, setQuery] = useState("");
  const [searchBy, setSearchBy] = useState("all");
  const [sortBy, setSortBy] = useState(filtersMeta?.defaults?.sort || "recent");
  const [taskType, setTaskType] = useState("all");

  /**
   * Comprueba si un issue encaja con la búsqueda actual.
   *
   * @param {Object} issue Issue a evaluar.
   * @returns {boolean}
   */
  const matchQuery = (issue) => {
    const normalizedQuery = normalizeActiveIssueValue(query.trim());

    if (!normalizedQuery) return true;

    const byIssue = normalizeActiveIssueValue(issue?.name).includes(normalizedQuery);
    const byModel = normalizeActiveIssueValue(issue?.model?.name).includes(normalizedQuery);
    const byAdmin = adminContainsQuery(issue, normalizedQuery);
    const byAlternatives = alternativesContainsQuery(issue, normalizedQuery);
    const byCriteria = criteriaContainsQuery(issue?.criteria, normalizedQuery);

    if (searchBy === "issue") return byIssue;
    if (searchBy === "model") return byModel;
    if (searchBy === "admin") return byAdmin;
    if (searchBy === "alternatives") return byAlternatives;
    if (searchBy === "criteria") return byCriteria;

    return byIssue || byModel || byAdmin || byAlternatives || byCriteria;
  };

  /**
   * Lista base filtrada antes de aplicar la ordenación.
   *
   * @returns {Array}
   */
  const filteredIssuesBase = useMemo(() => {
    return (activeIssues || []).filter(matchQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIssues, query, searchBy]);

  /**
   * Lista final filtrada y ordenada.
   *
   * @returns {Array}
   */
  const filteredIssues = useMemo(() => {
    const list = [...filteredIssuesBase];

    const deadlineDays = (issue) => {
      const deadline = issue?.ui?.deadline;

      if (deadline?.hasDeadline && typeof deadline.daysLeft === "number") {
        return deadline.daysLeft;
      }

      if (issue?.closureDate) {
        const end = parseIssueDateDDMMYYYY(issue.closureDate);
        const now = Date.now();
        return Math.ceil((end - now) / (1000 * 60 * 60 * 24));
      }

      return 999999;
    };

    const smartPriority = (issue) => issue?.ui?.sortPriority ?? 90;

    if (sortBy === "name" || sortBy === "nameAsc") {
      list.sort((a, b) => (a?.name || "").localeCompare(b?.name || ""));
    } else if (sortBy === "nameDesc") {
      list.sort((a, b) => (b?.name || "").localeCompare(a?.name || ""));
    } else if (sortBy === "deadlineSoon") {
      list.sort((a, b) => deadlineDays(a) - deadlineDays(b));
    } else if (sortBy === "recent") {
      list.sort(
        (a, b) =>
          new Date(b?.createdAt || 0).getTime() -
          new Date(a?.createdAt || 0).getTime()
      );
    } else {
      list.sort((a, b) => {
        const priorityDiff = smartPriority(a) - smartPriority(b);
        if (priorityDiff !== 0) return priorityDiff;

        const deadlineDiff = deadlineDays(a) - deadlineDays(b);
        if (deadlineDiff !== 0) return deadlineDiff;

        return (a?.name || "").localeCompare(b?.name || "");
      });
    }

    return list;
  }, [filteredIssuesBase, sortBy]);

  /**
   * Fallback legacy para task center mientras no lleguen
   * secciones del servidor.
   *
   * @returns {Array}
   */
  const taskGroupsLegacy = useMemo(() => {
    const list = activeIssues || [];

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
      .map((group) => ({ ...group, items: list.filter(group.match) }))
      .filter((group) => group.items.length > 0);
  }, [activeIssues]);

  /**
   * Indica si el task center del servidor trae tareas útiles.
   *
   * @returns {boolean}
   */
  const serverHasTasks = useMemo(() => {
    const sections = taskCenter?.sections;

    return (
      Array.isArray(sections) &&
      sections.some(
        (section) => Array.isArray(section?.items) && section.items.length > 0
      )
    );
  }, [taskCenter]);

  /**
   * Número total de tareas usando el fallback legacy.
   *
   * @returns {number}
   */
  const legacyTotalTasks = useMemo(() => {
    return (taskGroupsLegacy || []).reduce(
      (accumulator, group) => accumulator + (group.items?.length || 0),
      0
    );
  }, [taskGroupsLegacy]);

  /**
   * Número total de tareas visible en la pantalla.
   *
   * @returns {number}
   */
  const tasksCount = useMemo(() => {
    if (serverHasTasks && typeof taskCenter?.total === "number") {
      return taskCenter.total;
    }

    return legacyTotalTasks;
  }, [serverHasTasks, taskCenter, legacyTotalTasks]);

  /**
   * Resumen superior del dashboard de issues activos.
   *
   * @returns {Object}
   */
  const overview = useMemo(() => {
    const list = activeIssues || [];
    const adminCount = list.filter((issue) => issue?.isAdmin).length;
    const readyResolve = list.filter((issue) => issue?.statusFlags?.canResolveIssue).length;

    return {
      total: list.length,
      tasks: tasksCount,
      admin: adminCount,
      readyResolve,
    };
  }, [activeIssues, tasksCount]);

  return {
    query,
    searchBy,
    sortBy,
    taskType,
    filteredIssues,
    taskGroupsLegacy,
    tasksCount,
    overview,
    setQuery,
    setSearchBy,
    setSortBy,
    setTaskType,
  };
};

export default useActiveIssuesListing;