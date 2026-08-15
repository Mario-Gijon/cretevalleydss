import {
  buildCriteriaWeightingRequestPayload,
} from "./buildCriteriaWeightingRequestPayload.js";
import { buildCriteriaWeightingExecutionResult } from "./buildCriteriaWeightingExecutionResult.js";
import { buildIssueModelExecutionResult } from "./buildIssueModelExecutionResult.js";
import { buildIssueModelRequestPayload } from "./buildIssueModelRequestPayload.js";
import { createBadRequestError } from "../../../utils/common/errors.js";
import { executeTrackedDecisionModelRequest } from "./executionEvidence.js";

const executeCriteriaWeightingApiModel = async ({
  issue,
  structureKey,
  requestPayload,
  decisionModelsServiceBaseUrl,
  httpClient,
}) => {
  const apiEndpoint = issue.criteriaWeightingApiEndpoint;
  const apiEndpointPath = apiEndpoint && apiEndpoint.path;
  const apiModelKey = issue.criteriaWeightingApiModelKey;

  if (typeof apiEndpointPath !== "string" || apiEndpointPath.trim() === "") {
    throw createBadRequestError(
      "Issue does not define a criteria weighting DecisionModelsService endpoint path",
      {
        field: "issue.criteriaWeightingApiEndpoint.path",
      }
    );
  }

  if (typeof apiModelKey !== "string" || apiModelKey.trim() === "") {
    throw createBadRequestError(
      "Issue does not define a criteria weighting DecisionModelsService model key",
      {
        field: "issue.criteriaWeightingApiModelKey",
      }
    );
  }

  const result = await executeDecisionModelRequest({
    apiEndpointPath,
    requestPayload,
    errorMessage: "Criteria weighting model execution failed",
    decisionModelsServiceBaseUrl,
    httpClient,
  });

  return buildCriteriaWeightingExecutionResult({
    structureKey,
    message: result.message,
    result,
    apiModelKey,
    apiEndpointPath,
  });
};

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
