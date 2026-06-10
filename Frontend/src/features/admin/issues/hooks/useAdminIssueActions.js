import { useMemo, useState } from "react";

import {
  editIssueExpertsAdminAction,
  getAllUsers,
  reassignIssueAdmin,
} from "../../../../services/admin.service";
import {
  buildAdminIssueAdminCandidates,
  buildAdminIssueAvailableExperts,
  buildAdminIssueCurrentParticipantEmails,
  buildAdminIssuePendingExpertsToAdd,
  buildAdminIssueResultingExpertsCount,
  countAdminIssueCurrentExperts,
} from "../logic/buildAdminIssueExpertEditorState";
import { buildAdminIssueDetailView } from "../logic/buildAdminIssueDetailView";

export const useAdminIssueActions = ({
  showSnackbarAlert,
  issueDetail,
  expertEvaluations,
  expertWeights,
  selectedIssueRow,
  issueExpertsProgress,
  fetchIssuesData,
  loadIssueDetail,
  closeDetail,
}) => {
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

  const { issueForDomains } = useMemo(() => {
    return buildAdminIssueDetailView({
      issueDetail,
      expertEvaluations,
      expertWeights,
    });
  }, [issueDetail, expertEvaluations, expertWeights]);

  const adminCandidates = useMemo(() => {
    return buildAdminIssueAdminCandidates(admins);
  }, [admins]);

  const currentParticipantEmails = useMemo(() => {
    return buildAdminIssueCurrentParticipantEmails(issueExpertsProgress);
  }, [issueExpertsProgress]);

  const availableExperts = useMemo(() => {
    return buildAdminIssueAvailableExperts({
      allExperts,
      currentParticipantEmails,
      expertsToAdd,
    });
  }, [allExperts, currentParticipantEmails, expertsToAdd]);

  const pendingAddExpertsInfo = useMemo(() => {
    return buildAdminIssuePendingExpertsToAdd(allExperts, expertsToAdd);
  }, [allExperts, expertsToAdd]);

  const currentEditableExpertsCount = useMemo(() => {
    return countAdminIssueCurrentExperts(issueExpertsProgress);
  }, [issueExpertsProgress]);

  const resultingExpertsCount = useMemo(() => {
    return buildAdminIssueResultingExpertsCount({
      currentEditableExpertsCount,
      expertsToAdd,
      expertsToRemove,
    });
  }, [currentEditableExpertsCount, expertsToAdd, expertsToRemove]);

  const resetExpertEditionState = () => {
    setExpertsToAdd([]);
    setExpertsToRemove([]);
    setAddExpertsOpen(false);
    setAssignDomainsOpen(false);
  };

  const resetIssueActionState = () => {
    setConfirmAction(null);
    setReassignOpen(false);
    setNewAdminId("");
    resetExpertEditionState();
  };

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
        ? prev.filter((entry) => entry !== email)
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
        !Array.isArray(issueForDomains?.alternatives) ||
        issueForDomains.alternatives.length === 0 ||
        !Array.isArray(issueForDomains?.criteria) ||
        issueForDomains.criteria.length === 0
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
    reassignOpen,
    reassignLoading,
    adminsLoading,
    newAdminId,
    actionBusy,
    confirmAction,
    addExpertsOpen,
    addExpertsLoading,
    expertsToAdd,
    expertsToRemove,
    assignDomainsOpen,
    adminCandidates,
    availableExperts,
    pendingAddExpertsInfo,
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
    handleSaveExpertsChanges,
    handleConfirmDomains,
    resetExpertEditionState,
    resetIssueActionState,
    setAddExpertsOpen,
    setExpertsToAdd,
    setExpertsToRemove,
    setAssignDomainsOpen,
    setReassignOpen,
    setNewAdminId,
  };
};
