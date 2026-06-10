import { useEffect, useMemo, useState } from "react";

import { getAllIssues } from "../../../../services/admin.service";
import { filterAdminIssues } from "../logic/filterAdminIssues";
import {
  buildAdminIssueStageOptions,
  buildAdminIssueStats,
} from "../logic/buildAdminIssueStats";

export const useAdminIssuesList = ({ showSnackbarAlert }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [issues, setIssues] = useState([]);

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [consensusFilter, setConsensusFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");

  const fetchIssuesData = async ({ keepLoading = false } = {}) => {
    try {
      if (keepLoading) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const res = await getAllIssues();

      if (!res?.success) {
        showSnackbarAlert(res?.message || "Error fetching issues", "error");
        setIssues([]);
        return;
      }

      setIssues(Array.isArray(res?.data?.issues) ? res.data.issues : []);
    } catch (err) {
      console.error(err);
      showSnackbarAlert("Unexpected error fetching issues", "error");
      setIssues([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchIssuesData();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredIssues = useMemo(() => {
    return filterAdminIssues({
      issues,
      search,
      activeFilter,
      consensusFilter,
      stageFilter,
    });
  }, [issues, search, activeFilter, consensusFilter, stageFilter]);

  const stats = useMemo(() => buildAdminIssueStats(issues), [issues]);

  const stageOptions = useMemo(() => buildAdminIssueStageOptions(issues), [issues]);

  return {
    loading,
    refreshing,
    issues,
    search,
    activeFilter,
    consensusFilter,
    stageFilter,
    filteredIssues,
    stats,
    stageOptions,
    fetchIssuesData,
    setSearch,
    setActiveFilter,
    setConsensusFilter,
    setStageFilter,
  };
};
