import { useEffect, useMemo, useState } from "react";
import { useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";

import { useSnackbarAlertContext } from "../../../../../context/snackbarAlert/snackbarAlert.context";
import {
  editIssueExpertsAdminAction,
  getAllIssues,
  getAllUsers,
  getIssueByIdAdmin,
  getIssueExpertEvaluations,
  getIssueExpertsProgress,
  getIssueExpertWeights,
  reassignIssueAdmin,
} from "../../../../../services/admin.service";
import {
  normalize,
  pickInitialExpertId,
  prettyStage,
  safeArray,
  summarizeIssueStats,
} from "../adminIssues.utils";

/**
 * Gestiona estado, acciones y datos derivados de la seccion Admin Issues.
 *
 * @returns {object}
 */
export const useAdminIssuesSection = () => {
  const theme = useTheme();
  const isMdDown = useMediaQuery(theme.breakpoints.down("md"));
  const { showSnackbarAlert } = useSnackbarAlertContext();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [issues, setIssues] = useState([]);

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [consensusFilter, setConsensusFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTab, setDetailTab] = useState(0);
  const [detailLoading, setDetailLoading] = useState(false);

  const [selectedIssueRow, setSelectedIssueRow] = useState(null);
  const [issueDetail, setIssueDetail] = useState(null);
  const [issueExpertsProgress, setIssueExpertsProgress] = useState([]);

  const [selectedExpertId, setSelectedExpertId] = useState("");
  const [expertEvalLoading, setExpertEvalLoading] = useState(false);
  const [expertEvaluations, setExpertEvaluations] = useState(null);
  const [expertWeights, setExpertWeights] = useState(null);

  const [reassignOpen, setReassignOpen] = useState(false);
  const [reassignLoading, setReassignLoading] = useState(false);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [admins, setAdmins] = useState([]);
  const [newAdminId, setNewAdminId] = useState("");

  const [actionBusy, setActionBusy] = useState({
    compute: false,
    resolve: false,
    remove: false,
    editExperts: false,
  });
  const [confirmAction, setConfirmAction] = useState(null);

  const [addExpertsOpen, setAddExpertsOpen] = useState(false);
  const [addExpertsLoading, setAddExpertsLoading] = useState(false);
  const [allExperts, setAllExperts] = useState([]);
  const [expertsToAdd, setExpertsToAdd] = useState([]);
  const [expertsToRemove, setExpertsToRemove] = useState([]);
  const [assignDomainsOpen, setAssignDomainsOpen] = useState(false);

  const fetchIssuesData = async ({ keepLoading = false } = {}) => {
    try {
      if (keepLoading) setRefreshing(true);
      else setLoading(true);

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

  const resetExpertEditionState = () => {
    setExpertsToAdd([]);
    setExpertsToRemove([]);
    setAddExpertsOpen(false);
    setAssignDomainsOpen(false);
  };

  const loadIssueDetail = async (issueId, issueRow = null) => {
    if (!issueId) return;

    setDetailLoading(true);
    setExpertEvaluations(null);
    setExpertWeights(null);

    try {
      const [detailRes, progressRes] = await Promise.all([
        getIssueByIdAdmin(issueId),
        getIssueExpertsProgress(issueId),
      ]);

      if (!detailRes?.success) {
        showSnackbarAlert(detailRes?.message || "Error fetching issue detail", "error");
        return;
      }

      if (!progressRes?.success) {
        showSnackbarAlert(progressRes?.message || "Error fetching issue progress", "error");
        return;
      }

      setSelectedIssueRow(issueRow || null);
      setIssueDetail(detailRes?.data?.issue || null);

      const progressRows = Array.isArray(progressRes?.data?.experts)
        ? progressRes.data.experts
        : [];
      setIssueExpertsProgress(progressRows);

      const initialExpertId = pickInitialExpertId(progressRows);
      setSelectedExpertId((prev) => {
        if (prev && progressRows.some((r) => r?.expert?.id === prev)) return prev;
        return initialExpertId;
      });
    } catch (err) {
      console.error(err);
      showSnackbarAlert("Unexpected error fetching issue detail", "error");
    } finally {
      setDetailLoading(false);
    }
  };

  const openDetail = async (issueRow) => {
    resetExpertEditionState();
    setDetailOpen(true);
    setDetailTab(0);
    await loadIssueDetail(issueRow?.id, issueRow);
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setDetailTab(0);
    setSelectedIssueRow(null);
    setIssueDetail(null);
    setIssueExpertsProgress([]);
    setSelectedExpertId("");
    setExpertEvaluations(null);
    setExpertWeights(null);
    setConfirmAction(null);
    resetExpertEditionState();
  };

  useEffect(() => {
    const run = async () => {
      if (!detailOpen || !issueDetail?.id || !selectedExpertId) {
        setExpertEvaluations(null);
        setExpertWeights(null);
        return;
      }

      setExpertEvalLoading(true);

      try {
        const [evalRes, weightsRes] = await Promise.all([
          getIssueExpertEvaluations(issueDetail.id, selectedExpertId),
          getIssueExpertWeights(issueDetail.id, selectedExpertId),
        ]);

        if (!evalRes?.success) {
          showSnackbarAlert(evalRes?.message || "Error fetching expert evaluations", "error");
          setExpertEvaluations(null);
        } else {
          setExpertEvaluations(evalRes?.data || null);
        }

        if (!weightsRes?.success) {
          showSnackbarAlert(weightsRes?.message || "Error fetching expert weights", "error");
          setExpertWeights(null);
        } else {
          setExpertWeights(weightsRes?.data || null);
        }
      } catch (err) {
        console.error(err);
        showSnackbarAlert("Unexpected error fetching expert review", "error");
        setExpertEvaluations(null);
        setExpertWeights(null);
      } finally {
        setExpertEvalLoading(false);
      }
    };

    run();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailOpen, issueDetail?.id, selectedExpertId]);

  const filteredIssues = useMemo(() => {
    const q = normalize(search);

    return safeArray(issues).filter((issue) => {
      const matchesSearch =
        !q ||
        normalize(issue?.name).includes(q) ||
        normalize(issue?.description).includes(q) ||
        normalize(issue?.model?.name).includes(q) ||
        normalize(issue?.admin?.email).includes(q) ||
        normalize(issue?.admin?.name).includes(q);

      const matchesActive =
        activeFilter === "all"
          ? true
          : activeFilter === "active"
            ? Boolean(issue?.active)
            : !issue?.active;

      const matchesConsensus =
        consensusFilter === "all"
          ? true
          : consensusFilter === "consensus"
            ? Boolean(issue?.isConsensus)
            : !issue?.isConsensus;

      const matchesStage =
        stageFilter === "all"
          ? true
          : normalize(issue?.currentStage) === normalize(stageFilter);

      return matchesSearch && matchesActive && matchesConsensus && matchesStage;
    });
  }, [issues, search, activeFilter, consensusFilter, stageFilter]);

  const stats = useMemo(() => summarizeIssueStats(issues), [issues]);

  const stageOptions = useMemo(() => {
    const map = new Map();

    safeArray(issues).forEach((issue) => {
      const key = issue?.currentStage || "unknown";
      const label = prettyStage(issue);
      if (!map.has(key)) map.set(key, label);
    });

    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [issues]);

  const selectedExpertProgress = useMemo(() => {
    return issueExpertsProgress.find((r) => r?.expert?.id === selectedExpertId) || null;
  }, [issueExpertsProgress, selectedExpertId]);

  const adminCandidates = useMemo(() => {
    return safeArray(admins).filter(
      (u) => u?.role === "admin" && u?.accountConfirm
    );
  }, [admins]);

  const currentParticipantEmails = useMemo(() => {
    return safeArray(issueExpertsProgress)
      .filter((r) => r?.currentParticipant && r?.expert?.email)
      .map((r) => r.expert.email);
  }, [issueExpertsProgress]);

  const availableExperts = useMemo(() => {
    return safeArray(allExperts).filter((user) => {
      if (!user?.email) return false;
      if (user?.role === "admin") return false;
      if (user?.accountConfirm === false) return false;
      if (currentParticipantEmails.includes(user.email)) return false;
      if (expertsToAdd.includes(user.email)) return false;
      return true;
    });
  }, [allExperts, currentParticipantEmails, expertsToAdd]);

  const pendingAddExpertsInfo = useMemo(() => {
    return safeArray(allExperts).filter((u) => expertsToAdd.includes(u.email));
  }, [allExperts, expertsToAdd]);

  const currentEditableExpertsCount = useMemo(() => {
    return safeArray(issueExpertsProgress).filter((r) => r?.currentParticipant).length;
  }, [issueExpertsProgress]);

  const resultingExpertsCount = useMemo(() => {
    return currentEditableExpertsCount - expertsToRemove.length + expertsToAdd.length;
  }, [currentEditableExpertsCount, expertsToAdd.length, expertsToRemove.length]);

  const issueForDomains = useMemo(() => {
    if (!issueDetail) return null;

    const fallbackCriteria = safeArray(issueDetail?.leafCriteria).map((c) => ({
      name: c?.name,
      type: c?.type,
      children: [],
    }));

    return {
      ...issueDetail,
      alternatives: safeArray(issueDetail?.alternatives),
      criteria: safeArray(issueDetail?.criteria).length ? issueDetail.criteria : fallbackCriteria,
    };
  }, [issueDetail]);

  const openReassignDialog = async () => {
    if (!issueDetail?.id) return;

    setReassignOpen(true);
    setNewAdminId("");
    setAdminsLoading(true);

    try {
      const res = await getAllUsers({ includeAdmins: true });

      if (!res?.success) {
        showSnackbarAlert(res?.message || "Error fetching admins", "error");
        setAdmins([]);
        return;
      }

      setAdmins(Array.isArray(res?.data?.users) ? res.data.users : []);
    } catch (err) {
      console.error(err);
      showSnackbarAlert("Unexpected error fetching admins", "error");
      setAdmins([]);
    } finally {
      setAdminsLoading(false);
    }
  };

  const handleReassignAdmin = async () => {
    if (!issueDetail?.id || !newAdminId) {
      showSnackbarAlert("Select a new admin", "error");
      return;
    }

    setReassignLoading(true);

    try {
      const res = await reassignIssueAdmin({
        issueId: issueDetail.id,
        newAdminId,
      });

      if (!res?.success) {
        showSnackbarAlert(res?.message || "Error reassigning issue admin", "error");
        return;
      }

      showSnackbarAlert(res?.message || "Issue admin reassigned successfully", "success");
      setReassignOpen(false);
      await fetchIssuesData({ keepLoading: true });
      await loadIssueDetail(issueDetail.id, selectedIssueRow);
    } catch (err) {
      console.error(err);
      showSnackbarAlert("Unexpected error reassigning issue admin", "error");
    } finally {
      setReassignLoading(false);
    }
  };

  const openConfirmAction = ({ key, title, description, run }) => {
    setConfirmAction({
      key,
      title,
      description,
      run,
    });
  };

  const closeConfirmAction = () => {
    setConfirmAction(null);
  };

  const handleRunConfirmedAction = async () => {
    if (!confirmAction?.run || !issueDetail?.id) return;

    const key = confirmAction.key;
    setActionBusy((prev) => ({ ...prev, [key]: true }));

    try {
      const res = await confirmAction.run();

      if (!res?.success) {
        showSnackbarAlert(res?.message || "Action failed", "error");
        return;
      }

      showSnackbarAlert(res?.message || "Action completed successfully", "success");
      closeConfirmAction();

      if (key === "remove") {
        closeDetail();
        await fetchIssuesData({ keepLoading: true });
        return;
      }

      await fetchIssuesData({ keepLoading: true });
      await loadIssueDetail(issueDetail.id, selectedIssueRow);
    } catch (err) {
      console.error(err);
      showSnackbarAlert("Unexpected error executing action", "error");
    } finally {
      setActionBusy((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleOpenAddExperts = async () => {
    if (!issueDetail?.creatorActionsState?.canEditExperts) {
      showSnackbarAlert("You cannot edit experts in this issue right now.", "error");
      return;
    }

    setAddExpertsOpen(true);
    setAddExpertsLoading(true);

    try {
      const res = await getAllUsers({ includeAdmins: false });

      if (!res?.success) {
        showSnackbarAlert(res?.message || "Error fetching experts", "error");
        setAllExperts([]);
        return;
      }

      setAllExperts(Array.isArray(res?.data?.users) ? res.data.users : []);
    } catch (err) {
      console.error(err);
      showSnackbarAlert("Unexpected error fetching experts", "error");
      setAllExperts([]);
    } finally {
      setAddExpertsLoading(false);
    }
  };

  const toggleRemoveExpert = (email) => {
    setExpertsToRemove((prev) =>
      prev.includes(email)
        ? prev.filter((e) => e !== email)
        : [...prev, email]
    );
  };

  const handleResetExpertChanges = () => {
    setExpertsToAdd([]);
    setExpertsToRemove([]);
  };

  const processEditExperts = async (domainAssignments = null) => {
    if (!issueDetail?.id) return;

    setActionBusy((prev) => ({ ...prev, editExperts: true }));

    try {
      const res = await editIssueExpertsAdminAction({
        issueId: issueDetail.id,
        expertsToAdd,
        expertsToRemove,
        domainAssignments,
      });

      if (!res?.success) {
        showSnackbarAlert(res?.message || "Error updating experts", "error");
        return;
      }

      showSnackbarAlert(res?.message || "Experts updated successfully", "success");

      setAssignDomainsOpen(false);
      setAddExpertsOpen(false);
      setExpertsToAdd([]);
      setExpertsToRemove([]);

      await fetchIssuesData({ keepLoading: true });
      await loadIssueDetail(issueDetail.id, selectedIssueRow);
    } catch (err) {
      console.error(err);
      showSnackbarAlert("Unexpected error updating experts", "error");
    } finally {
      setActionBusy((prev) => ({ ...prev, editExperts: false }));
    }
  };

  const handleSaveExpertsChanges = async () => {
    if (!issueDetail?.creatorActionsState?.canEditExperts) {
      showSnackbarAlert("You cannot edit experts in this issue right now.", "error");
      return;
    }

    if (expertsToAdd.length === 0 && expertsToRemove.length === 0) {
      showSnackbarAlert("There are no pending expert changes.", "info");
      return;
    }

    if (resultingExpertsCount < 1) {
      showSnackbarAlert("An issue must have at least one current expert.", "error");
      return;
    }

    if (expertsToAdd.length > 0) {
      if (
        !safeArray(issueForDomains?.alternatives).length ||
        !safeArray(issueForDomains?.criteria).length
      ) {
        showSnackbarAlert(
          "Issue detail must include alternatives and criteria to assign expression domains.",
          "error"
        );
        return;
      }

      setAssignDomainsOpen(true);
      return;
    }

    await processEditExperts(null);
  };

  const handleConfirmDomains = async (domainAssignments) => {
    await processEditExperts(domainAssignments);
  };

  return {
    theme,
    isMdDown,
    loading,
    refreshing,
    issues,
    search,
    activeFilter,
    consensusFilter,
    stageFilter,
    detailOpen,
    detailTab,
    detailLoading,
    selectedIssueRow,
    issueDetail,
    issueExpertsProgress,
    selectedExpertId,
    expertEvalLoading,
    expertEvaluations,
    expertWeights,
    reassignOpen,
    reassignLoading,
    adminsLoading,
    admins,
    newAdminId,
    actionBusy,
    confirmAction,
    addExpertsOpen,
    addExpertsLoading,
    allExperts,
    expertsToAdd,
    expertsToRemove,
    assignDomainsOpen,
    fetchIssuesData,
    resetExpertEditionState,
    loadIssueDetail,
    openDetail,
    closeDetail,
    filteredIssues,
    stats,
    stageOptions,
    selectedExpertProgress,
    adminCandidates,
    currentParticipantEmails,
    availableExperts,
    pendingAddExpertsInfo,
    currentEditableExpertsCount,
    resultingExpertsCount,
    issueForDomains,
    openReassignDialog,
    handleReassignAdmin,
    openConfirmAction,
    closeConfirmAction,
    handleRunConfirmedAction,
    handleOpenAddExperts,
    toggleRemoveExpert,
    handleResetExpertChanges,
    processEditExperts,
    handleSaveExpertsChanges,
    handleConfirmDomains,
    setSearch,
    setActiveFilter,
    setConsensusFilter,
    setStageFilter,
    setDetailTab,
    setSelectedExpertId,
    setAddExpertsOpen,
    setExpertsToAdd,
    setExpertsToRemove,
    setAssignDomainsOpen,
    setReassignOpen,
    setNewAdminId,
  };
};
