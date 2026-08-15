import {
  buildCriteriaWeightingRequestPayload,
} from "./buildCriteriaWeightingRequestPayload.js";
import { buildCriteriaWeightingExecutionResult } from "./buildCriteriaWeightingExecutionResult.js";
import { buildIssueModelExecutionResult } from "./buildIssueModelExecutionResult.js";
import { buildIssueModelRequestPayload } from "./buildIssueModelRequestPayload.js";
import { executeTrackedDecisionModelRequest } from "./executionEvidence.js";

export const executeAlternativeEvaluationModel = async ({
  issue,
  structureKey,
  evaluations,
  phase,
  expertWeightsByExpertId = null,
  decisionModelsServiceBaseUrl,
  httpClient,
  message,
  executionErrorMessage = "Alternative evaluation model execution failed",
  issueUpdates = {},
  nextCurrentStage = null,
  executionAttemptInput,
}) => {
  const requestPayload = await buildIssueModelRequestPayload({
    issue,
    structureKey,
    evaluations,
    phase,
    expertWeightsByExpertId,
  });

  const tracked = await executeTrackedDecisionModelRequest({
    attemptInput: executionAttemptInput,
    apiEndpointPath: issue.apiEndpoint.path,
    requestPayload,
    errorMessage: executionErrorMessage,
    decisionModelsServiceBaseUrl,
    httpClient,
    normalize: async (result) => buildIssueModelExecutionResult({ issue, message, result, structureKey, issueUpdates, nextCurrentStage }),
  });
  return { ...tracked.result, executionAttempt: tracked.attempt };
};

export const executeCriteriaWeightingModel = async ({
  issue,
  structure,
  structureKey,
  evaluations,
  phase,
  expertWeightsByExpertId = null,
  decisionModelsServiceBaseUrl,
  httpClient,
  executionAttemptInput,
  normalizeResult = null,
}) => {
  const requestPayload = await buildCriteriaWeightingRequestPayload({
    issue,
    structureKey,
    evaluations,
    phase,
    expertWeightsByExpertId,
  });

  const apiEndpointPath = issue.criteriaWeightingApiEndpoint?.path;
  const apiModelKey = issue.criteriaWeightingApiModelKey;
  const tracked = await executeTrackedDecisionModelRequest({ attemptInput: executionAttemptInput, apiEndpointPath, requestPayload, errorMessage: "Criteria weighting model execution failed", decisionModelsServiceBaseUrl, httpClient,
    normalize: async (result) => { const built = buildCriteriaWeightingExecutionResult({ structureKey, message: result.message, result, apiModelKey, apiEndpointPath }); return normalizeResult ? normalizeResult(built) : built; }, });
  return { ...tracked.result, executionAttempt: tracked.attempt };
};
