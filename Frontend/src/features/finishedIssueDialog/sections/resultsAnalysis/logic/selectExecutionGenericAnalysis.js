export const selectExecutionGenericAnalysis = (payload, executionKey) => {
  if (typeof executionKey !== "string" || !executionKey) return null;
  const entries = payload?.resultsAnalysis?.executions;
  if (!Array.isArray(entries)) return null;
  return entries.find((entry) => entry?.executionKey === executionKey)?.genericAnalysis ?? null;
};

export default selectExecutionGenericAnalysis;
