import { normalizeModelExecutionResult } from "./normalizeModelExecutionResult.js";

export const buildIssueModelExecutionResult = ({
  issue,
  message,
  result,
  structureKey,
  issueUpdates,
  nextCurrentStage,
}) => {
  const normalizedResult = normalizeModelExecutionResult({ result });

  return {
    message,
    consensusMeasure: normalizedResult.consensusMeasure,
    rankedAlternatives: normalizedResult.rankedAlternatives,
    collectiveEvaluations: normalizedResult.collectiveEvaluations,
    plotsGraphic: normalizedResult.plotsGraphic,
    modelExecution: {
      kind: "apiModels",
      structureKey,
      apiModelKey: issue.apiModelKey,
      apiEndpointPath: issue.apiEndpoint.path,
      executedAt: new Date(),
    },
    rawOutput: normalizedResult.rawOutput,
    issueUpdates,
    nextCurrentStage,
  };
};
