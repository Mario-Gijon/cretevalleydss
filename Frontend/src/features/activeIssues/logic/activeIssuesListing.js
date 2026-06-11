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

  const compareByName = (a, b) => a.name.localeCompare(b.name);

  const creationTimestamp = (issue) => {
    const fromCreatedAt = new Date(issue.createdAt).getTime();
    if (Number.isFinite(fromCreatedAt) && fromCreatedAt > 0) {
      return fromCreatedAt;
    }

    return parseIssueDateDDMMYYYY(issue.creationDate);
  };

  const finalizationTimestamp = (issue) => parseIssueDateDDMMYYYY(issue.closureDate);

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
 * Construye el resumen superior del dashboard de issues activos.
 *
 * @param {Object} params Parametros del resumen.
 * @param {Array} params.activeIssues Lista de issues activos.
 * @param {number} params.tasksCount Numero de tareas visibles.
 * @returns {Object}
 */
export const buildActiveIssuesOverview = ({ activeIssues, tasksCount }) => {
  const adminCount = activeIssues.filter((issue) => issue.isAdmin).length;
  const readyResolve = activeIssues.filter(
    (issue) => issue.statusFlags.canResolveIssue
  ).length;

  return {
    total: activeIssues.length,
    tasks: tasksCount,
    admin: adminCount,
    readyResolve,
  };
};
