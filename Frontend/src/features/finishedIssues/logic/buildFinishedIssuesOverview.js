export const buildFinishedIssuesOverview = ({
  finishedIssues,
  filteredCount,
}) => {
  return {
    total: finishedIssues.length,
    admin: finishedIssues.filter((issue) => issue.isAdmin).length,
    withClosure: finishedIssues.filter((issue) => Boolean(issue.closureDate)).length,
    filtered: filteredCount,
  };
};
