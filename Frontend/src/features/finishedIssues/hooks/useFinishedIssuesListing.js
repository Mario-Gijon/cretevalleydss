import { useEffect, useMemo, useState } from "react";

import { buildFinishedIssuesOverview } from "../logic/buildFinishedIssuesOverview";
import { filterFinishedIssues } from "../logic/filterFinishedIssues";
import { sortFinishedIssues } from "../logic/sortFinishedIssues";

export const FINISHED_ISSUES_PAGE_SIZE = 6;

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
  const [sortBy, setSortBy] = useState("finalizationDate");
  const [page, setPage] = useState(1);

  /**
   * Lista base filtrada antes de aplicar la ordenación.
   *
   * @returns {Array}
   */
  const filteredIssuesBase = useMemo(() => {
    return filterFinishedIssues({
      finishedIssues,
      query,
      searchBy,
    });
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
    return buildFinishedIssuesOverview({
      finishedIssues,
      filteredCount: filteredIssues.length,
    });
  }, [finishedIssues, filteredIssues.length]);

  const pageCount = Math.max(
    1,
    Math.ceil(filteredIssues.length / FINISHED_ISSUES_PAGE_SIZE)
  );
  const currentPage = Math.min(page, pageCount);

  useEffect(() => {
    setPage((current) => Math.min(current, pageCount));
  }, [pageCount]);

  useEffect(() => {
    setPage(1);
  }, [query, searchBy, sortBy]);

  const paginatedIssues = useMemo(() => {
    const start = (currentPage - 1) * FINISHED_ISSUES_PAGE_SIZE;
    return filteredIssues.slice(start, start + FINISHED_ISSUES_PAGE_SIZE);
  }, [currentPage, filteredIssues]);

  return {
    query,
    searchBy,
    sortBy,
    filteredIssues,
    paginatedIssues,
    page: currentPage,
    pageCount,
    overview,
    setQuery,
    setSearchBy,
    setSortBy,
    setPage,
  };
};

export default useFinishedIssuesListing;
