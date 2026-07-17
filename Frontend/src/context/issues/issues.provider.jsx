import { useCallback, useEffect, useMemo, useState } from "react";

import { IssuesDataContext } from "./issues.context.js";
import {
  getAllActiveIssues,
  getAllFinishedIssues,
  getAllUsers,
  getExpressionsDomain,
  getModelsInfo,
} from "../../services/issue.service.js";

/**
 * Expone los datos globales relacionados con issues, modelos, expertos y dominios.
 *
 * @param {object} props Propiedades del componente.
 * @param {*} props.children Contenido hijo.
 * @returns {*}
 */
export const IssuesDataProvider = ({ children }) => {
  const [initialExperts, setInitialExperts] = useState([]);
  const [models, setModels] = useState([]);
  const [criteriaWeightingModels, setCriteriaWeightingModels] = useState([]);
  const [activeIssues, setActiveIssues] = useState([]);
  const [taskCenter, setTaskCenter] = useState(null);
  const [filtersMeta, setFiltersMeta] = useState(null);
  const [finishedIssues, setFinishedIssues] = useState([]);
  const [globalDomains, setGlobalDomains] = useState([]);
  const [expressionDomains, setExpressionDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [issueCreated, setIssueCreated] = useState("");

  /**
   * Aplica el payload de /issues/active al estado del contexto.
   *
   * @param {object|null} payload Datos de la respuesta.
   * @returns {object|null}
   */
  const applyActivePayload = useCallback((payload) => {
    const activePayload = payload && typeof payload === "object" ? payload : null;

    setActiveIssues(activePayload?.issues ?? []);
    setTaskCenter(activePayload?.taskCenter ?? null);
    setFiltersMeta(activePayload?.filtersMeta ?? null);

    return activePayload;
  }, []);

  /**
   * Carga los issues activos.
   *
   * @returns {Promise<object|null>}
   */
  const fetchActiveIssues = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getAllActiveIssues();

      if (!response?.success) {
        applyActivePayload(null);
        return null;
      }

      return applyActivePayload(response?.data ?? null);
    } catch (error) {
      console.error("Failed to load active issues", error);
      applyActivePayload(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [applyActivePayload]);

  /**
   * Carga los issues finalizados.
   *
   * @returns {Promise<Array>}
   */
  const fetchFinishedIssues = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getAllFinishedIssues();

      if (!response?.success) {
        setFinishedIssues([]);
        return [];
      }

      const list = Array.isArray(response?.data) ? response.data : [];
      setFinishedIssues(list);
      return list;
    } catch (error) {
      console.error("Failed to load finished issues", error);
      setFinishedIssues([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Carga los issues activos y finalizados.
   *
   * @returns {Promise<void>}
   */
  const fetchIssues = useCallback(async () => {
    try {
      setLoading(true);

      const [activeData, finishedData] = await Promise.all([
        getAllActiveIssues(),
        getAllFinishedIssues(),
      ]);

      if (activeData?.success) {
        applyActivePayload(activeData?.data ?? null);
      } else {
        applyActivePayload(null);
      }

      if (finishedData?.success) {
        setFinishedIssues(Array.isArray(finishedData?.data) ? finishedData.data : []);
      } else {
        setFinishedIssues([]);
      }
    } catch (error) {
      console.error("Failed to load issues", error);
      applyActivePayload(null);
      setFinishedIssues([]);
    } finally {
      setLoading(false);
    }
  }, [applyActivePayload]);

  /**
   * Carga expertos, modelos y dominios necesarios para el contexto.
   *
   * @returns {Promise<void>}
   */
  const fetchInitialData = useCallback(async () => {
    try {
      const [expertsData, modelsData, domainsData] = await Promise.all([
        getAllUsers(),
        getModelsInfo(),
        getExpressionsDomain(),
      ]);

      const modelsPayload = modelsData?.data;
      const issueModels = Array.isArray(modelsPayload)
        ? modelsPayload
        : Array.isArray(modelsPayload?.models)
          ? modelsPayload.models
          : [];
      const criteriaModels = Array.isArray(modelsPayload?.criteriaWeightingModels)
        ? modelsPayload.criteriaWeightingModels
        : [];

      setInitialExperts(expertsData?.data ?? []);
      setModels(issueModels);
      setCriteriaWeightingModels(criteriaModels);
      setGlobalDomains(domainsData?.data?.globals ?? []);
      setExpressionDomains(domainsData?.data?.userDomains ?? []);
    } catch (error) {
      console.error("Failed to load issue context data", error);
      setInitialExperts([]);
      setModels([]);
      setCriteriaWeightingModels([]);
      setGlobalDomains([]);
      setExpressionDomains([]);
    }
  }, []);

  useEffect(() => {
    /**
     * Inicializa los datos globales del contexto de issues.
     *
     * @returns {Promise<void>}
     */
    const initializeIssuesData = async () => {
      await Promise.all([fetchIssues(), fetchInitialData()]);
    };

    initializeIssuesData();

  }, [fetchInitialData, fetchIssues]);

  useEffect(() => {
    if (!issueCreated) {
      return;
    }

    fetchActiveIssues();

  }, [fetchActiveIssues, issueCreated]);

  const issuesContextValue = useMemo(() => ({
    initialExperts,
    models,
    criteriaWeightingModels,
    globalDomains,
    expressionDomains,
    setExpressionDomains,
    loading,
    setLoading,
    issueCreated,
    setIssueCreated,
    activeIssues,
    taskCenter,
    filtersMeta,
    finishedIssues,
    setActiveIssues,
    setTaskCenter,
    setFiltersMeta,
    setFinishedIssues,
    fetchActiveIssues,
    fetchFinishedIssues,
    fetchIssues,
  }), [
    activeIssues,
    criteriaWeightingModels,
    expressionDomains,
    fetchActiveIssues,
    fetchFinishedIssues,
    fetchIssues,
    filtersMeta,
    finishedIssues,
    globalDomains,
    initialExperts,
    issueCreated,
    loading,
    models,
    taskCenter,
  ]);

  return (
    <IssuesDataContext.Provider value={issuesContextValue}>
      {children}
    </IssuesDataContext.Provider>
  );
};
