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
 * @returns {Object}
 */
export const useActiveIssuesListing = ({
  activeIssues = [],
  taskCenter = null,
}) => {
  const [query, setQuery] = useState("");
  const [searchBy, setSearchBy] = useState("all");
  const [sortBy, setSortBy] = useState("creationDate");
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
