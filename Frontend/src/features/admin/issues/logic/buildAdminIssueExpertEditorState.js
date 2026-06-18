export const buildAdminIssueOwnerCandidates = (users = []) => {
  const list = Array.isArray(users) ? users : [];

  return list.filter((user) => user?.accountConfirm);
};

export const buildAdminIssueCurrentParticipantEmails = (
  issueExpertsProgress = []
) => {
  const list = Array.isArray(issueExpertsProgress) ? issueExpertsProgress : [];

  return list
    .filter((row) => row?.currentParticipant && row?.expert?.email)
    .map((row) => row.expert.email);
};

export const buildAdminIssueAvailableExperts = ({
  allExperts,
  currentParticipantEmails,
  expertsToAdd,
}) => {
  const experts = Array.isArray(allExperts) ? allExperts : [];

  return experts.filter((user) => {
    if (!user?.email) return false;
    if (user?.role === "admin") return false;
    if (user?.accountConfirm === false) return false;
    if (currentParticipantEmails.includes(user.email)) return false;
    if (expertsToAdd.includes(user.email)) return false;
    return true;
  });
};

export const buildAdminIssuePendingExpertsToAdd = (
  allExperts,
  expertsToAdd
) => {
  const experts = Array.isArray(allExperts) ? allExperts : [];
  return experts.filter((user) => expertsToAdd.includes(user.email));
};

export const countAdminIssueCurrentExperts = (issueExpertsProgress = []) => {
  const list = Array.isArray(issueExpertsProgress) ? issueExpertsProgress : [];
  return list.filter((row) => row?.currentParticipant).length;
};

export const buildAdminIssueResultingExpertsCount = ({
  currentEditableExpertsCount,
  expertsToAdd,
  expertsToRemove,
}) =>
  currentEditableExpertsCount - expertsToRemove.length + expertsToAdd.length;
