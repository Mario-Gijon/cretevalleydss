export const buildFinishedIssuesOverview = ({
  finishedIssues,
  filteredCount,
}) => {
  return {
    total: finishedIssues.length,
    owner: finishedIssues.filter((issue) => issue.isIssueOwner).length,
    withClosure: finishedIssues.filter((issue) => Boolean(issue.closureDate)).length,
    filtered: filteredCount,
  };
};
