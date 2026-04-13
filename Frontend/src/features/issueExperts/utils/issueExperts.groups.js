/**
 * Construye los grupos visibles de expertos del issue.
 *
 * @param {Object|null} issue Issue actual.
 * @returns {Array}
 */
export const buildIssueExpertsGroups = (issue) => {
  return [
    {
      key: "participated",
      title: "Participated",
      list: issue?.participatedExperts || [],
    },
    {
      key: "acceptedNotEvaluated",
      title: "Accepted (not evaluated)",
      list: issue?.acceptedButNotEvaluatedExperts || [],
    },
    {
      key: "pending",
      title: "Pending invitations",
      list: issue?.pendingExperts || [],
    },
    {
      key: "declined",
      title: "Declined",
      list: issue?.notAcceptedExperts || [],
    },
  ];
};

export default buildIssueExpertsGroups;