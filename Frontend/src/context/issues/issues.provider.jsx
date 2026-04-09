import { useEffect, useState } from "react";

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
 * @param {object} props
 * @param {*} props.children
 * @returns {*}
 */
export const IssuesDataProvider = ({ children }) => {
  const [initialExperts, setInitialExperts] = useState([]);
  const [models, setModels] = useState([]);
  const [activeIssues, setActiveIssues] = useState([]);
  const [finishedIssues, setFinishedIssues] = useState([]);
  const [globalDomains, setGlobalDomains] = useState([]);
  const [expressionDomains, setExpressionDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [issueCreated, setIssueCreated] = useState("");

  const fetchActiveIssues = async () => {
    try {
      setLoading(true);
      const data = await getAllActiveIssues();
      setActiveIssues(data?.issues ?? []);
    } catch (error) {
      console.error("Failed to load active issues", error);
      setActiveIssues([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchFinishedIssues = async () => {
    try {
      setLoading(true);
      const data = await getAllFinishedIssues();
      setFinishedIssues(data?.issues ?? []);
    } catch (error) {
      console.error("Failed to load finished issues", error);
      setFinishedIssues([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchIssues = async () => {
    try {
      setLoading(true);

      const [activeData, finishedData] = await Promise.all([
        getAllActiveIssues(),
        getAllFinishedIssues(),
      ]);

      setActiveIssues(activeData?.issues ?? []);
      setFinishedIssues(finishedData?.issues ?? []);
    } catch (error) {
      console.error("Failed to load issues", error);
      setActiveIssues([]);
      setFinishedIssues([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchInitialData = async () => {
    try {
      const [expertsData, modelsData, domainsData] = await Promise.all([
        getAllUsers(),
        getModelsInfo(),
        getExpressionsDomain(),
      ]);

      setInitialExperts(expertsData ?? []);
      setModels(modelsData ?? []);
      setGlobalDomains(domainsData?.globals ?? []);
      setExpressionDomains(domainsData?.userDomains ?? []);
    } catch (error) {
      console.error("Failed to load issue context data", error);
      setInitialExperts([]);
      setModels([]);
      setGlobalDomains([]);
      setExpressionDomains([]);
    }
  };

  useEffect(() => {
    const initializeIssuesData = async () => {
      await Promise.all([fetchIssues(), fetchInitialData()]);
    };

    initializeIssuesData();
  }, []);

  useEffect(() => {
    if (!issueCreated) {
      return;
    }

    fetchActiveIssues();
  }, [issueCreated]);

  const issuesContextValue = {
    initialExperts,
    models,
    globalDomains,
    expressionDomains,
    setExpressionDomains,
    loading,
    setLoading,
    issueCreated,
    setIssueCreated,
    activeIssues,
    finishedIssues,
    setActiveIssues,
    setFinishedIssues,
    fetchActiveIssues,
    fetchFinishedIssues,
    fetchIssues,
  };

  return (
    <IssuesDataContext.Provider value={issuesContextValue}>
      {children}
    </IssuesDataContext.Provider>
  );
};