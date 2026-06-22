export const resolveFinishedIssueEvaluationStructure = (viewIssue) =>
  viewIssue?.summary?.evaluationStructureKey ||
  viewIssue?.modelParams?.base?.evaluationStructureKey ||
  null;
