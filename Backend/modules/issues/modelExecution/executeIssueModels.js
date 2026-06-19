import {
  buildCriteriaWeightingRequestPayload,
} from "./buildCriteriaWeightingRequestPayload.js";
import { buildCriteriaWeightingExecutionResult } from "./buildCriteriaWeightingExecutionResult.js";
import { buildIssueModelExecutionResult } from "./buildIssueModelExecutionResult.js";
import { buildIssueModelRequestPayload } from "./buildIssueModelRequestPayload.js";
import { createBadRequestError } from "../../../utils/common/errors.js";
import { executeDecisionModelRequest } from "./executeApiModelRequest.js";

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
  });
};

export const executeAlternativeEvaluationModel = async ({
  issue,
  structureKey,
  evaluations,
  phase,
  decisionModelsServiceBaseUrl,
  httpClient,
  message,
  executionErrorMessage = "Alternative evaluation model execution failed",
  issueUpdates = {},
  nextCurrentStage = null,
}) => {
  const requestPayload = await buildIssueModelRequestPayload({
    issue,
    structureKey,
    evaluations,
    phase,
  });

  const result = await executeDecisionModelRequest({
    apiEndpointPath: issue.apiEndpoint.path,
    requestPayload,
    errorMessage: executionErrorMessage,
    decisionModelsServiceBaseUrl,
    httpClient,
  });

  return buildIssueModelExecutionResult({
    issue,
    message,
    result,
    structureKey,
    issueUpdates,
    nextCurrentStage,
  });
};

export const executeCriteriaWeightingModel = async ({
  issue,
  structure,
  structureKey,
  evaluations,
  phase,
  decisionModelsServiceBaseUrl,
  httpClient,
}) => {
  const requestPayload = await buildCriteriaWeightingRequestPayload({
    issue,
    structureKey,
    evaluations,
    phase,
  });

  return executeCriteriaWeightingApiModel({
    issue,
    structureKey,
    requestPayload,
    decisionModelsServiceBaseUrl,
    httpClient,
  });
};
