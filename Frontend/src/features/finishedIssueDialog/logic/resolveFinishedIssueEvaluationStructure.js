export const resolveFinishedIssueEvaluationStructure = (viewIssue) =>
  viewIssue?.summary?.alternativeEvaluationStructureKey ||
  viewIssue?.modelParams?.base?.alternativeEvaluationStructureKey ||
  null;
