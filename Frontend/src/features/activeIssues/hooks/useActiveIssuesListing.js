import { useMemo, useState } from "react";

import {
  buildActiveIssuesOverview,
  buildFilteredActiveIssues,
} from "../logic/activeIssuesListing";

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
   * Lista final filtrada y ordenada.
   *
   * @returns {Array}
   */
  const filteredIssues = useMemo(() => {
    return buildFilteredActiveIssues({
      activeIssues,
      query,
      searchBy,
      sortBy,
    });
  }, [activeIssues, query, searchBy, sortBy]);

  /**
   * Número total de tareas visible en la pantalla.
   *
   * @returns {number}
   */
  const tasksCount = useMemo(() => {
    return typeof taskCenter?.total === "number" ? taskCenter.total : 0;
  }, [taskCenter]);

  /**
   * Resumen superior del dashboard de issues activos.
   *
   * @returns {Object}
   */
  const overview = useMemo(() => {
    return buildActiveIssuesOverview({
      activeIssues,
      tasksCount,
    });
  }, [activeIssues, tasksCount]);

  return {
    query,
    searchBy,
    sortBy,
    taskType,
    filteredIssues,
    tasksCount,
    overview,
    setQuery,
    setSearchBy,
    setSortBy,
    setTaskType,
  };
};

export default useActiveIssuesListing;
