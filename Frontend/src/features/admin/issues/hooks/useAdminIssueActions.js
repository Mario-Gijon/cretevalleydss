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
import { modelUsesExpertWeights } from "../../../../utils/expertWeights.utils.js";

export const useAdminIssueActions = ({
  showSnackbarAlert,
  issueDetail,
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
  const [expertWeightsOpen, setExpertWeightsOpen] = useState(false);
  const actionState =
    issueDetail?.adminActionsState || issueDetail?.ownerActionsState || {};

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
    setExpertWeightsOpen(false);
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

  const processEditExperts = async (expertWeightsByEmail = null) => {
    if (!issueDetail?.id) return;

    setActionBusy((prev) => ({ ...prev, editExperts: true }));

    try {
      const res = await editIssueExpertsAdminAction({
        issueId: issueDetail.id,
        expertsToAdd,
        expertsToRemove,
        ...(expertWeightsByEmail ? { expertWeightsByEmail } : {}),
      });

      if (!res?.success) {
        showSnackbarAlert(res?.message || "Error updating experts", "error");
        return;
      }

      showSnackbarAlert(res?.message || "Experts updated successfully", "success");

      resetExpertEditionState();

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

    if (
      modelUsesExpertWeights(issueDetail?.model) &&
      (expertsToAdd.length > 0 || expertsToRemove.length > 0)
    ) {
      setExpertWeightsOpen(true);
      return;
    }

    await processEditExperts();
  };

  const finalExpertParticipants = useMemo(() => {
    const current = Array.isArray(issueDetail?.participants)
      ? issueDetail.participants
      : [];
    const currentByEmail = new Map(
      current.map((participant) => [participant?.expert?.email, {
        email: participant?.expert?.email,
        name: participant?.expert?.name || "",
        weight: participant?.weight,
      }])
    );
    const finalExperts = Array.from(currentByEmail.values()).filter(
      (expert) => expert.email && !expertsToRemove.includes(expert.email)
    );

    expertsToAdd.forEach((email) => {
      if (!currentByEmail.has(email)) {
        const expert = allExperts.find((item) => item.email === email);
        finalExperts.push({ email, name: expert?.name || "", weight: 0, isNew: true });
      }
    });

    return finalExperts.sort((left, right) => left.email.localeCompare(right.email));
  }, [allExperts, expertsToAdd, expertsToRemove, issueDetail?.participants]);

  const currentExpertWeightsByEmail = useMemo(
    () => finalExpertParticipants.reduce((weights, expert) => {
      weights[expert.email] = expert.weight;
      return weights;
    }, {}),
    [finalExpertParticipants]
  );

  const confirmExpertWeights = async (expertWeightsByEmail) => {
    await processEditExperts(expertWeightsByEmail);
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
    expertWeightsOpen,
    finalExpertParticipants,
    currentExpertWeightsByEmail,
    ownerCandidates,
    availableExperts,
    pendingAddExpertsInfo,
    resultingExpertsCount,
    openReassignDialog,
    handleReassignOwner,
    openConfirmAction,
    closeConfirmAction,
    handleRunConfirmedAction,
    handleOpenAddExperts,
    toggleRemoveExpert,
    handleResetExpertChanges,
    handleSaveExpertsChanges,
    confirmExpertWeights,
    resetExpertEditionState,
    resetIssueActionState,
    setAddExpertsOpen,
    setExpertsToAdd,
    setExpertsToRemove,
    setExpertWeightsOpen,
    setReassignOpen,
    setNewOwnerId,
  };
};
