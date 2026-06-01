import { executeApiModelRequest } from "./executeApiModelRequest.js";
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
  apiModelsBaseUrl,
  httpClient,
}) => {
  const modelOutput = await executeApiModelRequest({
    apiEndpointPath: targetRuntimeSnapshot.targetApiEndpoint.path,
    requestPayload,
    errorMessage: "Scenario model execution failed",
    apiModelsBaseUrl,
    httpClient,
  });

  const standardResult = normalizeModelExecutionResult({
    result: modelOutput,
    messages: SCENARIO_NORMALIZATION_MESSAGES,
    options: {
      requireResultObject: false,
      validateAlternativeIdType: false,
      enforceRankOrdering: false,
    },
  });

  const modelExecution = {
    kind: "apiModels",
    structureKey:
      targetRuntimeSnapshot.targetAlternativeEvaluationStructureKey,
    apiModelKey: targetRuntimeSnapshot.targetApiModelKey,
    apiEndpointPath: targetRuntimeSnapshot.targetApiEndpoint.path,
    executedAt: new Date(),
  };

  return {
    standardResult,
    modelExecution,
    rawOutput: standardResult.rawOutput,
  };
};
