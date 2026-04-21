import { useMemo, useState } from "react";

import {
  finishedIssueMatchesSearch,
  sortFinishedIssues,
} from "../utils/finishedIssues.filters";

/**
 * Gestiona la búsqueda, ordenación y métricas derivadas
 * de la pantalla de issues finalizados.
 *
 * Mantiene fuera del componente principal toda la lógica de listado
 * sin alterar el comportamiento visual actual.
 *
 * @param {Object} params Parámetros del hook.
 * @param {Array} params.finishedIssues Lista de issues finalizados.
 * @returns {Object}
 */
export const useFinishedIssuesListing = ({ finishedIssues = [] }) => {
  const [query, setQuery] = useState("");
  const [searchBy, setSearchBy] = useState("all");
  const [sortBy, setSortBy] = useState("name");

  /**
   * Lista base filtrada antes de aplicar la ordenación.
   *
   * @returns {Array}
   */
  const filteredIssuesBase = useMemo(() => {
    const safeIssues = Array.isArray(finishedIssues) ? finishedIssues : [];

    return safeIssues.filter((issue) =>
      finishedIssueMatchesSearch(issue, query, searchBy)
    );
  }, [finishedIssues, query, searchBy]);

  /**
   * Lista final filtrada y ordenada.
   *
   * @returns {Array}
   */
  const filteredIssues = useMemo(() => {
    return sortFinishedIssues(filteredIssuesBase, sortBy);
  }, [filteredIssuesBase, sortBy]);

  /**
   * Resumen superior del dashboard de issues finalizados.
   *
   * @returns {Object}
   */
  const overview = useMemo(() => {
    const safeIssues = Array.isArray(finishedIssues) ? finishedIssues : [];

    return {
      total: safeIssues.length,
      admin: safeIssues.filter((issue) => issue?.isAdmin).length,
      withClosure: safeIssues.filter((issue) => Boolean(issue?.closureDate)).length,
      filtered: filteredIssues.length,
    };
  }, [finishedIssues, filteredIssues.length]);

  return {
    query,
    searchBy,
    sortBy,
    filteredIssues,
    overview,
    setQuery,
    setSearchBy,
    setSortBy,
  };
};

export default useFinishedIssuesListing;
