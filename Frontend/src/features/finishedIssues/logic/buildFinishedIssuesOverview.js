export const buildFinishedIssuesOverview = ({
  finishedIssues,
  filteredCount,
}) => {
  const safeIssues = Array.isArray(finishedIssues) ? finishedIssues : [];

  return {
    total: safeIssues.length,
    admin: safeIssues.filter((issue) => issue?.isAdmin).length,
    withClosure: safeIssues.filter((issue) => Boolean(issue?.closureDate)).length,
    filtered: filteredCount,
  };
};
