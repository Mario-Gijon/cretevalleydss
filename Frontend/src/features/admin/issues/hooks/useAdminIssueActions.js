import { useMemo, useState } from "react";

import {
  editIssueExpertsAdminAction,
  getAllUsers,
  reassignIssueOwner,
} from "../../../../services/admin.service";
import {
  buildAdminIssueOwnerCandidates,
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
  const [ownerCandidatesLoading, setOwnerCandidatesLoading] = useState(false);
  const [ownerCandidateUsers, setOwnerCandidateUsers] = useState([]);
  const [newOwnerId, setNewOwnerId] = useState("");

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
  const actionState =
    issueDetail?.adminActionsState || issueDetail?.ownerActionsState || {};

  const { issueForDomains } = useMemo(() => {
    return buildAdminIssueDetailView({
      issueDetail,
      expertEvaluations,
      expertWeights,
    });
  }, [issueDetail, expertEvaluations, expertWeights]);

  const ownerCandidates = useMemo(() => {
    return buildAdminIssueOwnerCandidates(ownerCandidateUsers);
  }, [ownerCandidateUsers]);

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
    setNewOwnerId("");
    resetExpertEditionState();
  };

  const openReassignDialog = async () => {
    if (!issueDetail?.id) return;

    setReassignOpen(true);
    setNewOwnerId("");
    setOwnerCandidatesLoading(true);

    try {
      const res = await getAllUsers({ includeAdmins: true });

      if (!res?.success) {
        showSnackbarAlert(res?.message || "Error fetching users", "error");
        setOwnerCandidateUsers([]);
        return;
      }

      setOwnerCandidateUsers(Array.isArray(res?.data?.users) ? res.data.users : []);
    } catch (err) {
      console.error(err);
      showSnackbarAlert("Unexpected error fetching users", "error");
      setOwnerCandidateUsers([]);
    } finally {
      setOwnerCandidatesLoading(false);
    }
  };

  const handleReassignOwner = async () => {
    if (!issueDetail?.id || !newOwnerId) {
      showSnackbarAlert("Select a new owner", "error");
      return;
    }

    setReassignLoading(true);

    try {
      const res = await reassignIssueOwner({
        issueId: issueDetail.id,
        newOwnerId,
      });

      if (!res?.success) {
        showSnackbarAlert(res?.message || "Error reassigning issue owner", "error");
        return;
      }

      showSnackbarAlert(res?.message || "Issue owner reassigned successfully", "success");
      setReassignOpen(false);
      await fetchIssuesData({ keepLoading: true });
      await loadIssueDetail(issueDetail.id, selectedIssueRow);
    } catch (err) {
      console.error(err);
      showSnackbarAlert("Unexpected error reassigning issue owner", "error");
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
    if (!actionState.canEditExperts) {
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
    if (!actionState.canEditExperts) {
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
    ownerCandidatesLoading,
    newOwnerId,
    actionBusy,
    confirmAction,
    addExpertsOpen,
    addExpertsLoading,
    expertsToAdd,
    expertsToRemove,
    assignDomainsOpen,
    ownerCandidates,
    availableExperts,
    pendingAddExpertsInfo,
    resultingExpertsCount,
    issueForDomains,
    openReassignDialog,
    handleReassignOwner,
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
    setNewOwnerId,
  };
};
