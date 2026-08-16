import { serializePersistedExecutionAnalysis } from "../../../resultsAnalysis/index.js";

export const serializeResultsAnalysis = ({ analyses, scenarios }) => {
  const currentScenarioIds = new Set((scenarios || []).map((scenario) => String(scenario._id)));
  const executions = (analyses || [])
    .filter((entry) => entry.executionKey === "base" || (entry.executionType === "scenario" && entry.scenario && currentScenarioIds.has(String(entry.scenario))))
    .map(serializePersistedExecutionAnalysis)
    .sort((left, right) => {
      if (left.executionKey === "base") return -1;
      if (right.executionKey === "base") return 1;
      return left.executionKey.localeCompare(right.executionKey);
    });
  return { executions };
};
