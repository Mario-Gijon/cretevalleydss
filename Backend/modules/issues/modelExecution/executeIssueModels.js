import {
  buildCriteriaWeightingExecutionResult,
  buildCriteriaWeightingRequestPayload,
  buildIssueModelExecutionResult,
  buildIssueModelRequestPayload,
} from "./buildIssueModelExecutionArtifacts.js";
import { createBadRequestError } from "../../../utils/common/errors.js";
import { executeApiModelRequest } from "./executeApiModelRequest.js";
import { executeLocalCriteriaWeightingModelIfSupported } from "./executeLocalCriteriaWeightingModel.js";

const executeCriteriaWeightingApiModel = async ({
  issue,
  structureKey,
  requestPayload,
  apiModelsBaseUrl,
  httpClient,
}) => {
  const apiEndpoint = issue.criteriaWeightingApiEndpoint;
  const apiEndpointPath = apiEndpoint && apiEndpoint.path;
  const apiModelKey = issue.criteriaWeightingApiModelKey;

  if (typeof apiEndpointPath !== "string" || apiEndpointPath.trim() === "") {
    throw createBadRequestError(
      "Issue does not define a criteria weighting ApiModels endpoint path",
      {
        field: "issue.criteriaWeightingApiEndpoint.path",
      }
    );
  }

  if (typeof apiModelKey !== "string" || apiModelKey.trim() === "") {
    throw createBadRequestError(
      "Issue does not define a criteria weighting ApiModels model key",
      {
        field: "issue.criteriaWeightingApiModelKey",
      }
    );
  }

  const result = await executeApiModelRequest({
    apiEndpointPath,
    requestPayload,
    errorMessage: "Criteria weighting model execution failed",
    apiModelsBaseUrl,
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
  apiModelsBaseUrl,
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

  const result = await executeApiModelRequest({
    apiEndpointPath: issue.apiEndpoint.path,
    requestPayload,
    errorMessage: executionErrorMessage,
    apiModelsBaseUrl,
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
  apiModelsBaseUrl,
  httpClient,
}) => {
  const requestPayload = await buildCriteriaWeightingRequestPayload({
    issue,
    structureKey,
    evaluations,
    phase,
  });

  const localExecutionResult = await executeLocalCriteriaWeightingModelIfSupported({
    structure,
    requestPayload,
  });

  if (localExecutionResult) {
    return buildCriteriaWeightingExecutionResult({
      structureKey,
      message: localExecutionResult.message,
      result: localExecutionResult,
    });
  }

  return executeCriteriaWeightingApiModel({
    issue,
    structureKey,
    requestPayload,
    apiModelsBaseUrl,
    httpClient,
  });
};
