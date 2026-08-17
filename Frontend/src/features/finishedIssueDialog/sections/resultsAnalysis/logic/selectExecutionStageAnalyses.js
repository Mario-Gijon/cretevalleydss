export const selectExecutionStageAnalyses = (payload, executionKey) => {
  if (typeof executionKey !== "string" || !executionKey) return {};
  const entries = payload?.resultsAnalysis?.executions;
  if (!Array.isArray(entries)) return {};
  const stageAnalyses = entries.find((entry) => entry?.executionKey === executionKey)?.stageAnalyses;
  return stageAnalyses && typeof stageAnalyses === "object" && !Array.isArray(stageAnalyses) ? stageAnalyses : {};
};

export default selectExecutionStageAnalyses;
