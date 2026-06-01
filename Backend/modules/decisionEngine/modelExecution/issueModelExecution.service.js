import {
  buildCriteriaWeightingExecutionResult,
  buildCriteriaWeightingRequestPayload,
  buildIssueModelExecutionResult,
  buildIssueModelRequestPayload,
} from "./issueModelExecution.builder.js";
import { createBadRequestError } from "../../../utils/common/errors.js";
import { executeApiModelRequest } from "./executeApiModelRequest.js";

const computeManualCriteriaWeights = ({ structureKey, requestPayload }) => {
  const criterionNames = requestPayload.context.criteria.map(
    (criterion) => criterion.name
  );
  const evaluations = requestPayload.evaluations;

  if (!Array.isArray(evaluations) || evaluations.length === 0) {
    throw createBadRequestError("Manual criteria weights require completed evaluations", {
      field: "evaluations",
    });
  }

  const criteriaSums = criterionNames.reduce((accumulator, criterionName) => {
    accumulator[criterionName] = 0;
    return accumulator;
  }, {});

  for (const evaluation of evaluations) {
    const weightsByCriterion = evaluation.payload.weightsByCriterion;
    for (const criterionName of criterionNames) {
      criteriaSums[criterionName] += Number(weightsByCriterion[criterionName]);
    }
  }

  const averagedWeightsByCriterion = criterionNames.reduce(
    (accumulator, criterionName) => {
      accumulator[criterionName] =
        criteriaSums[criterionName] / evaluations.length;
      return accumulator;
    },
    {}
  );

  const totalAverage = criterionNames.reduce(
    (total, criterionName) => total + averagedWeightsByCriterion[criterionName],
    0
  );

  if (!(totalAverage > 0)) {
    throw createBadRequestError(
      "Manual criteria weights cannot be normalized because their total is not positive",
      {
        field: "payload.weightsByCriterion",
      }
    );
  }

  const weightsByCriterion = criterionNames.reduce((accumulator, criterionName) => {
    accumulator[criterionName] =
      averagedWeightsByCriterion[criterionName] / totalAverage;
    return accumulator;
  }, {});

  return {
    message: "Criteria weights computed successfully",
    consensusMeasure: null,
    weightsByCriterion,
    collectiveEvaluations: { weightsByCriterion },
    modelExecution: {
      kind: "local",
      structureKey,
      executedAt: new Date(),
    },
    rawOutput: {},
  };
};

const executeCriteriaWeightingApiModel = async ({
  issue,
  structureKey,
  requestPayload,
  apiModelsBaseUrl,
  httpClient,
}) => {
  const apiEndpointPath = String(issue?.criteriaWeightingApiEndpoint?.path || "").trim();
  const apiModelKey = String(issue?.criteriaWeightingApiModelKey || "").trim();

  if (!apiEndpointPath) {
    throw createBadRequestError(
      "Issue does not define a criteria weighting ApiModels endpoint path",
      {
        field: "issue.criteriaWeightingApiEndpoint.path",
      }
    );
  }

  if (!apiModelKey) {
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
    message: result?.message,
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

  if (structureKey === "manualCriteriaWeights") {
    const result = computeManualCriteriaWeights({
      structureKey,
      requestPayload,
    });

    return buildCriteriaWeightingExecutionResult({
      structureKey,
      message: result.message,
      result,
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
