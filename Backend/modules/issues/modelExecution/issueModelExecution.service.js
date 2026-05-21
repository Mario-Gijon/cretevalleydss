import {
  createModelApiRequestError,
  unwrapModelApiResponse,
} from "../../../services/modelApi/modelResponse.js";
import { createBadRequestError } from "../../../utils/common/errors.js";
import {
  EVALUATION_STRUCTURE_KEYS,
} from "../evaluations/evaluation.constants.js";
import {
  buildCriteriaWeightingExecutionResult,
  buildCriteriaWeightingRequestPayload,
  buildIssueModelExecutionResult,
  buildIssueModelRequestPayload,
} from "./issueModelExecution.builder.js";

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const normalizeText = (value) =>
  typeof value === "string" ? value.trim() : "";

const validateSubmittedBwmPayloadOrThrow = ({ criterionNames, payload }) => {
  const bestCriterion = normalizeText(payload?.bestCriterion);
  const worstCriterion = normalizeText(payload?.worstCriterion);
  const bestToOthers = payload?.bestToOthers;
  const othersToWorst = payload?.othersToWorst;

  if (!bestCriterion) {
    throw createBadRequestError("bestCriterion is required", {
      field: "payload.bestCriterion",
    });
  }

  if (!worstCriterion) {
    throw createBadRequestError("worstCriterion is required", {
      field: "payload.worstCriterion",
    });
  }

  if (!criterionNames.includes(bestCriterion)) {
    throw createBadRequestError("bestCriterion must be a valid criterion name", {
      field: "payload.bestCriterion",
    });
  }

  if (!criterionNames.includes(worstCriterion)) {
    throw createBadRequestError("worstCriterion must be a valid criterion name", {
      field: "payload.worstCriterion",
    });
  }

  if (criterionNames.length > 1 && bestCriterion === worstCriterion) {
    throw createBadRequestError(
      "bestCriterion and worstCriterion must be different",
      {
        field: "payload.worstCriterion",
      }
    );
  }

  if (!isPlainObject(bestToOthers) || !isPlainObject(othersToWorst)) {
    throw createBadRequestError(
      "BWM payload must include bestToOthers and othersToWorst maps",
      {
        field: "payload",
      }
    );
  }

  for (const criterionName of criterionNames) {
    const micValue = Number(bestToOthers[criterionName]);
    const licValue = Number(othersToWorst[criterionName]);

    if (criterionName !== bestCriterion) {
      if (!Number.isFinite(micValue) || micValue < 1 || micValue > 9) {
        throw createBadRequestError(
          `bestToOthers['${criterionName}'] must be between 1 and 9`,
          {
            field: "payload.bestToOthers",
          }
        );
      }
    }

    if (criterionName !== worstCriterion) {
      if (!Number.isFinite(licValue) || licValue < 1 || licValue > 9) {
        throw createBadRequestError(
          `othersToWorst['${criterionName}'] must be between 1 and 9`,
          {
            field: "payload.othersToWorst",
          }
        );
      }
    }
  }

  if (Number(bestToOthers[bestCriterion]) !== 1) {
    throw createBadRequestError("bestToOthers[bestCriterion] must be 1", {
      field: "payload.bestToOthers",
    });
  }

  if (Number(othersToWorst[worstCriterion]) !== 1) {
    throw createBadRequestError("othersToWorst[worstCriterion] must be 1", {
      field: "payload.othersToWorst",
    });
  }
};

const normalizeBwmWeightsOrThrow = ({ weights, criterionCount }) => {
  if (!Array.isArray(weights) || weights.length < criterionCount) {
    throw createBadRequestError("ApiModels BWM output does not contain valid weights", {
      field: "result.weights",
    });
  }

  const baseWeights = weights.slice(0, criterionCount).map(Number);
  if (baseWeights.some((value) => !Number.isFinite(value))) {
    throw createBadRequestError("ApiModels BWM output contains invalid weights", {
      field: "result.weights",
    });
  }

  const total = baseWeights.reduce((sum, value) => sum + value, 0);
  if (!(total > 0)) {
    throw createBadRequestError("ApiModels BWM output weights cannot be normalized", {
      field: "result.weights",
    });
  }

  return baseWeights.map((value) => value / total);
};

const computeManualCriteriaWeights = ({ issue, requestPayload, structureKey }) => {
  const criterionNames = requestPayload.context.criteria.map((criterion) => criterion.name);
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
    const weightsByCriterion = evaluation?.payload?.weightsByCriterion;

    if (!isPlainObject(weightsByCriterion)) {
      throw createBadRequestError(
        "Completed evaluation documents are missing manual criteria weights",
        {
          field: "payload.weightsByCriterion",
        }
      );
    }

    for (const criterionName of criterionNames) {
      const value = Number(weightsByCriterion[criterionName]);
      if (!Number.isFinite(value)) {
        throw createBadRequestError(
          `Completed manual weight for criterion '${criterionName}' is invalid`,
          {
            field: "payload.weightsByCriterion",
          }
        );
      }

      criteriaSums[criterionName] += value;
    }
  }

  const averagedWeightsByCriterion = criterionNames.reduce((accumulator, criterionName) => {
    accumulator[criterionName] = criteriaSums[criterionName] / evaluations.length;
    return accumulator;
  }, {});

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

  return buildCriteriaWeightingExecutionResult({
    issue,
    structureKey,
    message: "Criteria weights computed successfully",
    result: {
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
    },
  });
};

const computeBestWorstCriteriaWeights = async ({
  issue,
  requestPayload,
  structureKey,
  apiModelsBaseUrl,
  httpClient,
}) => {
  const criterionNames = requestPayload.context.criteria.map((criterion) => criterion.name);
  const expertsData = {};

  for (const evaluation of requestPayload.evaluations) {
    validateSubmittedBwmPayloadOrThrow({
      criterionNames,
      payload: evaluation?.payload,
    });

    const mic = criterionNames.map((criterionName) =>
      Number(evaluation.payload.bestToOthers[criterionName])
    );
    const lic = criterionNames.map((criterionName) =>
      Number(evaluation.payload.othersToWorst[criterionName])
    );

    const expertEmail = normalizeText(evaluation?.expert?.email);
    const expertId = normalizeText(evaluation?.expert?.id);
    const expertKey = expertEmail || `expert_${expertId || "unknown"}`;

    expertsData[expertKey] = { mic, lic };
  }

  if (Object.keys(expertsData).length === 0) {
    throw createBadRequestError("Incomplete BWM data from experts", {
      field: "payload",
    });
  }

  let response;
  try {
    response = await httpClient.post(`${apiModelsBaseUrl}/bwm`, {
      experts_data: expertsData,
      eps_penalty: 1,
    });
  } catch (error) {
    throw createModelApiRequestError(error, "Failed to compute BWM weights");
  }

  const results = unwrapModelApiResponse(response, "Failed to compute BWM weights");
  const normalizedWeights = normalizeBwmWeightsOrThrow({
    weights: results?.weights,
    criterionCount: criterionNames.length,
  });
  const weightsByCriterion = criterionNames.reduce((accumulator, criterionName, index) => {
    accumulator[criterionName] = normalizedWeights[index];
    return accumulator;
  }, {});

  return buildCriteriaWeightingExecutionResult({
    issue,
    structureKey,
    message: `Criteria weights for '${issue.name}' successfully computed.`,
    result: {
      message: `Criteria weights for '${issue.name}' successfully computed.`,
      consensusMeasure: null,
      weightsByCriterion,
      collectiveEvaluations: { weightsByCriterion },
      modelExecution: {
        kind: "apiModels",
        structureKey,
        apiEndpointPath: "/bwm",
        executedAt: new Date(),
      },
      rawOutput: results && isPlainObject(results) ? results : {},
    },
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

  if (structureKey === EVALUATION_STRUCTURE_KEYS.MANUAL_CRITERIA_WEIGHTS) {
    return computeManualCriteriaWeights({
      issue,
      requestPayload,
      structureKey,
    });
  }

  if (structureKey === EVALUATION_STRUCTURE_KEYS.BEST_WORST_CRITERIA) {
    return computeBestWorstCriteriaWeights({
      issue,
      requestPayload,
      structureKey,
      apiModelsBaseUrl,
      httpClient,
    });
  }

  throw createBadRequestError(
    `Unsupported criteria weighting structure '${structureKey || "unknown"}'`,
    {
      field: "structureKey",
    }
  );
};
