import { getOrGenerateFinishedIssueExecutionAnalysis } from "./finishedIssueExecutionAnalysis.js";

export const getFinishedIssueGlobalAnalysis = async ({ issueId, userId, ...dependencies }) => {
  const entry = await getOrGenerateFinishedIssueExecutionAnalysis({ issueId, userId, executionKey: "base", ...dependencies });
  return entry.genericAnalysis;
};
