import {
  createModelApiRequestError,
  unwrapModelApiResponse,
} from "../../../services/modelApi/modelResponse.js";
import {
  buildIssueModelExecutionResult,
  buildIssueModelRequestPayload,
} from "./issueModelExecution.builder.js";

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

  let response;
  try {
    response = await httpClient.post(
      `${apiModelsBaseUrl}${issue.apiEndpoint.path}`,
      requestPayload
    );
  } catch (error) {
    throw createModelApiRequestError(error, executionErrorMessage);
  }

  const result = unwrapModelApiResponse(response, executionErrorMessage);

  return buildIssueModelExecutionResult({
    issue,
    message,
    result,
    structureKey,
    issueUpdates,
    nextCurrentStage,
  });
};
