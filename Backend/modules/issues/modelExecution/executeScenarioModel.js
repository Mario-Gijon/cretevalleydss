import { executeTrackedDecisionModelRequest } from "./executionEvidence.js";
import { normalizeModelExecutionResult } from "./normalizeModelExecutionResult.js";

const SCENARIO_NORMALIZATION_MESSAGES = {
  resultRequired: "Scenario model execution result is required",
  rankedAlternativesRequired:
    "Scenario model execution result.rankedAlternatives must be a non-empty array",
  rankedAlternativeInvalidEntry: "Invalid rankedAlternatives entry",
  rankedAlternativeNameRequired: "rankedAlternatives entry requires name",
  rankedAlternativeScoreRequired:
    "rankedAlternatives entry requires finite score",
  rankedAlternativeRankRequired:
    "rankedAlternatives entry requires positive rank",
  collectiveEvaluationsRequired:
    "Scenario model execution result.collectiveEvaluations is required",
  plotsGraphicRequired: "Scenario model execution result.plotsGraphic is required",
  consensusMeasureInvalid:
    "Scenario model execution result.consensusMeasure must be finite or null",
  rawOutputRequired: "Scenario model execution result.rawOutput is required",
};

export const executeScenarioModel = async ({
  requestPayload,
  targetRuntimeSnapshot,
  decisionModelsServiceBaseUrl,
  httpClient,
  executionAttemptInput,
}) => {
  const tracked = await executeTrackedDecisionModelRequest({
    attemptInput: executionAttemptInput,
    apiEndpointPath: targetRuntimeSnapshot.targetApiEndpoint.path,
    requestPayload,
    errorMessage: "Scenario model execution failed",
    decisionModelsServiceBaseUrl,
    httpClient,
    normalize: async (modelOutput) => normalizeModelExecutionResult({
    result: modelOutput,
    messages: SCENARIO_NORMALIZATION_MESSAGES,
    options: {
      requireResultObject: false,
      validateAlternativeIdType: false,
      enforceRankOrdering: false,
    },
  }),
  });
  const standardResult = tracked.result;

  const modelExecution = {
    kind: "decisionModelsService",
    structureKey:
      targetRuntimeSnapshot.targetEvaluationStructureKey,
    apiModelKey: targetRuntimeSnapshot.targetApiModelKey,
    apiEndpointPath: targetRuntimeSnapshot.targetApiEndpoint.path,
    executedAt: tracked.attempt.completedAt,
    executionAttemptId: String(tracked.attempt._id), startedAt: tracked.attempt.startedAt, completedAt: tracked.attempt.completedAt, durationMs: tracked.attempt.durationMs,
  };

  return {
    standardResult,
    modelExecution,
    rawOutput: standardResult.rawOutput,
    executionAttempt: tracked.attempt,
  };
};
