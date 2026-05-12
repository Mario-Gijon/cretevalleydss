import {
  EVALUATION_STAGES,
  EVALUATION_STRUCTURE_KEYS,
} from "../../evaluation.constants.js";
import { IssueModel } from "../../../../../models/IssueModels.js";
import {
  createModelApiRequestError,
  unwrapModelApiResponse,
} from "../../../../../services/modelApi/modelResponse.js";
import {
  createBadRequestError,
  createInternalError,
} from "../../../../../utils/common/errors.js";
import { getOrderedAlternativeAndCriterionNames } from "../shared/alternativeEvaluation.helpers.js";

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const buildComparisonKey = (alternativeA, alternativeB) =>
  `${alternativeA}::${alternativeB}`;

const buildEmptyCell = () => ({
  value: "",
  expressionDomain: null,
});

const normalizeCellOrThrow = ({ cell, requireValue, field }) => {
  if (!isPlainObject(cell)) {
    throw createBadRequestError("Comparison cell must be an object", { field });
  }

  const rawValue = cell.value;
  const rawExpressionDomain = cell.expressionDomain;
  const hasValue = !(rawValue === "" || rawValue === null || rawValue === undefined);

  if (requireValue && !hasValue) {
    throw createBadRequestError(
      "All comparisons must include a value for submit",
      {
        field,
      }
    );
  }

  if (!hasValue) {
    return {
      value: "",
      expressionDomain: rawExpressionDomain ?? null,
    };
  }

  if (!isPlainObject(rawExpressionDomain)) {
    throw createBadRequestError(
      "Comparison expressionDomain is required when value is provided",
      { field }
    );
  }

  return {
    value: rawValue,
    expressionDomain: rawExpressionDomain,
  };
};

const buildExpectedPairsByCriterion = ({ criterionNames, alternativeNames }) => {
  const expectedPairsByCriterion = {};

  for (const criterionName of criterionNames) {
    expectedPairsByCriterion[criterionName] = [];

    for (const alternativeA of alternativeNames) {
      for (const alternativeB of alternativeNames) {
        if (alternativeA === alternativeB) {
          continue;
        }

        expectedPairsByCriterion[criterionName].push(
          buildComparisonKey(alternativeA, alternativeB)
        );
      }
    }
  }

  return expectedPairsByCriterion;
};

const isNonEmptyValue = (value) =>
  !(value === "" || value === null || value === undefined);

const normalizeEndpointPath = (value) => {
  const path = String(value || "").trim();
  if (!path) {
    return null;
  }

  return path.startsWith("/") ? path : `/${path}`;
};

const validateCompletedPairwiseEvaluationPayloadsOrThrow = ({
  evaluations,
  criterionNames,
  expectedPairsByCriterion,
}) => {
  for (const evaluation of evaluations) {
    const comparisonsByCriterion = evaluation?.payload?.comparisonsByCriterion;

    if (!isPlainObject(comparisonsByCriterion)) {
      throw createBadRequestError(
        "Completed pairwise evaluation payload.comparisonsByCriterion is required",
        {
          field: "payload.comparisonsByCriterion",
        }
      );
    }

    const unknownCriteriaKeys = Object.keys(comparisonsByCriterion).filter(
      (criterionName) => !criterionNames.includes(criterionName)
    );

    if (unknownCriteriaKeys.length > 0) {
      throw createBadRequestError(
        "Completed pairwise evaluation contains unknown criterion keys",
        {
          field: "payload.comparisonsByCriterion",
          details: {
            unknownCriteriaKeys,
          },
        }
      );
    }

    for (const criterionName of criterionNames) {
      const criterionComparisons = comparisonsByCriterion[criterionName];
      if (!isPlainObject(criterionComparisons)) {
        throw createBadRequestError(
          `Completed pairwise evaluation is missing criterion '${criterionName}' comparisons`,
          {
            field: "payload.comparisonsByCriterion",
          }
        );
      }

      const expectedPairs = expectedPairsByCriterion[criterionName];
      const expectedPairSet = new Set(expectedPairs);

      const unknownPairKeys = Object.keys(criterionComparisons).filter(
        (pairKey) => !expectedPairSet.has(pairKey)
      );

      if (unknownPairKeys.length > 0) {
        throw createBadRequestError(
          `Completed pairwise evaluation contains unknown pairs for criterion '${criterionName}'`,
          {
            field: "payload.comparisonsByCriterion",
            details: {
              criterionName,
              unknownPairKeys,
            },
          }
        );
      }

      for (const pairKey of expectedPairs) {
        const cell = criterionComparisons[pairKey];
        if (!isPlainObject(cell) || !isNonEmptyValue(cell.value)) {
          throw createBadRequestError(
            "Completed pairwise evaluation is missing required comparison values",
            {
              field: "payload.comparisonsByCriterion",
              details: {
                criterionName,
                pairKey,
              },
            }
          );
        }

        const numericValue = Number(cell.value);
        if (!Number.isFinite(numericValue)) {
          throw createBadRequestError(
            "Completed pairwise evaluation contains non-numeric comparison values",
            {
              field: "payload.comparisonsByCriterion",
              details: {
                criterionName,
                pairKey,
              },
            }
          );
        }
      }
    }
  }
};

const normalizePayloadOrThrow = async ({ payload, issue, requireValue }) => {
  if (!isPlainObject(payload)) {
    throw createBadRequestError("payload must be an object", {
      field: "payload",
    });
  }

  if (
    Object.prototype.hasOwnProperty.call(payload, "evaluations") ||
    Object.prototype.hasOwnProperty.call(payload, "rows") ||
    Object.prototype.hasOwnProperty.call(payload, "matrix") ||
    Object.prototype.hasOwnProperty.call(payload, "direct") ||
    Object.prototype.hasOwnProperty.call(payload, "pairwiseAlternatives")
  ) {
    throw createBadRequestError(
      "Unsupported alternative pairwise payload shape",
      {
        field: "payload",
      }
    );
  }

  if (!isPlainObject(payload.comparisonsByCriterion)) {
    throw createBadRequestError(
      "payload.comparisonsByCriterion must be an object",
      {
        field: "payload.comparisonsByCriterion",
      }
    );
  }

  const { alternativeNames, criterionNames } =
    await getOrderedAlternativeAndCriterionNames({ issue });
  const expectedPairsByCriterion = buildExpectedPairsByCriterion({
    criterionNames,
    alternativeNames,
  });

  const incomingCriteriaKeys = Object.keys(payload.comparisonsByCriterion);
  const unknownCriteriaKeys = incomingCriteriaKeys.filter(
    (criterionName) => !criterionNames.includes(criterionName)
  );

  if (unknownCriteriaKeys.length > 0) {
    throw createBadRequestError(
      "payload.comparisonsByCriterion contains unknown criterion keys",
      {
        field: "payload.comparisonsByCriterion",
      }
    );
  }

  const comparisonsByCriterion = {};

  for (const criterionName of criterionNames) {
    const expectedPairs = expectedPairsByCriterion[criterionName];
    const expectedPairSet = new Set(expectedPairs);
    const incomingComparisons = payload.comparisonsByCriterion[criterionName];

    if (
      incomingComparisons !== undefined &&
      !isPlainObject(incomingComparisons)
    ) {
      throw createBadRequestError(
        `payload.comparisonsByCriterion['${criterionName}'] must be an object`,
        {
          field: "payload.comparisonsByCriterion",
        }
      );
    }

    const safeIncomingComparisons = isPlainObject(incomingComparisons)
      ? incomingComparisons
      : {};

    const unknownPairKeys = Object.keys(safeIncomingComparisons).filter(
      (pairKey) => !expectedPairSet.has(pairKey)
    );

    if (unknownPairKeys.length > 0) {
      throw createBadRequestError(
        `payload.comparisonsByCriterion['${criterionName}'] contains unknown pair keys`,
        {
          field: "payload.comparisonsByCriterion",
        }
      );
    }

    comparisonsByCriterion[criterionName] = expectedPairs.reduce(
      (criterionComparisons, pairKey) => {
        const cell = safeIncomingComparisons[pairKey];

        criterionComparisons[pairKey] =
          cell === undefined
            ? buildEmptyCell()
            : normalizeCellOrThrow({
                cell,
                requireValue,
                field: "payload.comparisonsByCriterion",
              });

        return criterionComparisons;
      },
      {}
    );
  }

  return {
    comparisonsByCriterion,
  };
};

const buildGetPayload = async ({ storedEvaluation, issue }) => {
  const { alternativeNames, criterionNames } =
    await getOrderedAlternativeAndCriterionNames({ issue });
  const expectedPairsByCriterion = buildExpectedPairsByCriterion({
    criterionNames,
    alternativeNames,
  });

  const storedComparisonsByCriterion = isPlainObject(
    storedEvaluation?.payload?.comparisonsByCriterion
  )
    ? storedEvaluation.payload.comparisonsByCriterion
    : {};

  const comparisonsByCriterion = {};

  for (const criterionName of criterionNames) {
    const expectedPairs = expectedPairsByCriterion[criterionName];
    const storedCriterionComparisons = isPlainObject(
      storedComparisonsByCriterion[criterionName]
    )
      ? storedComparisonsByCriterion[criterionName]
      : {};

    comparisonsByCriterion[criterionName] = expectedPairs.reduce(
      (criterionComparisons, pairKey) => {
        const storedCell = storedCriterionComparisons[pairKey];

        if (!isPlainObject(storedCell)) {
          criterionComparisons[pairKey] = buildEmptyCell();
          return criterionComparisons;
        }

        criterionComparisons[pairKey] = {
          value:
            storedCell.value === "" ||
            storedCell.value === null ||
            storedCell.value === undefined
              ? ""
              : storedCell.value,
          expressionDomain: storedCell.expressionDomain ?? null,
        };

        return criterionComparisons;
      },
      {}
    );
  }

  return {
    comparisonsByCriterion,
  };
};

export const alternativePairwiseByCriterionStructure = Object.freeze({
  key: EVALUATION_STRUCTURE_KEYS.ALTERNATIVE_PAIRWISE_BY_CRITERION,
  stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,

  async init({ issue }) {
    return buildGetPayload({
      storedEvaluation: null,
      issue,
    });
  },

  async get({ storedEvaluation, issue }) {
    return buildGetPayload({
      storedEvaluation,
      issue,
    });
  },

  async send({ payload, issue }) {
    return normalizePayloadOrThrow({
      payload,
      issue,
      requireValue: false,
    });
  },

  async submit({ payload, issue }) {
    return normalizePayloadOrThrow({
      payload,
      issue,
      requireValue: true,
    });
  },

  async compute({ issue, evaluations, phase, apiModelsBaseUrl, httpClient }) {
    if (issue?.isConsensus !== true) {
      throw createBadRequestError(
        "Pairwise alternative computation currently requires a consensus issue",
        {
          field: "isConsensus",
        }
      );
    }

    const { alternatives, criteria, alternativeNames, criterionNames } =
      await getOrderedAlternativeAndCriterionNames({ issue });
    const expectedPairsByCriterion = buildExpectedPairsByCriterion({
      criterionNames,
      alternativeNames,
    });

    validateCompletedPairwiseEvaluationPayloadsOrThrow({
      evaluations,
      criterionNames,
      expectedPairsByCriterion,
    });

    let model = issue?.model;
    const hasModelRuntimeData =
      model &&
      typeof model === "object" &&
      typeof model?.apiModelKey === "string" &&
      typeof model?.apiEndpoint?.path === "string";

    if (!hasModelRuntimeData) {
      const modelId = issue?.model?._id || issue?.model;
      model = await IssueModel.findById(modelId).lean();
    }

    if (!model) {
      throw createBadRequestError("Selected issue model was not found", {
        field: "model",
      });
    }

    if (!model?.apiModelKey) {
      throw createBadRequestError("Issue model is missing apiModelKey", {
        field: "apiModelKey",
      });
    }

    const endpointPath = normalizeEndpointPath(model?.apiEndpoint?.path);
    if (!endpointPath) {
      throw createBadRequestError("Issue model is missing apiEndpoint.path", {
        field: "apiEndpoint.path",
      });
    }

    if (
      model?.alternativeEvaluationStructureKey !==
      EVALUATION_STRUCTURE_KEYS.ALTERNATIVE_PAIRWISE_BY_CRITERION
    ) {
      throw createBadRequestError(
        "Issue model does not support alternativePairwiseByCriterion structure",
        {
          field: "alternativeEvaluationStructureKey",
        }
      );
    }

    const requestPayload = {
      modelParameters: issue?.modelParameters || {},
      evaluations: evaluations.map((evaluation) => ({
        expert: {
          id: String(evaluation?.expert?._id || evaluation?.expert || ""),
          name: evaluation?.expert?.name || "",
          email: evaluation?.expert?.email || "",
        },
        payload: evaluation?.payload || {},
      })),
      context: {
        issue: {
          id: String(issue?._id || ""),
          name: issue?.name || "",
        },
        alternatives: alternatives.map((alternative) => ({
          id: String(alternative?._id || ""),
          name: alternative?.name || "",
        })),
        criteria: criteria.map((criterion) => ({
          id: String(criterion?._id || ""),
          name: criterion?.name || "",
          type: criterion?.type || "",
        })),
        weights: Array.isArray(issue?.modelParameters?.weights)
          ? issue.modelParameters.weights
          : [],
        consensusPhase: phase,
        previousStageResult: null,
      },
    };

    let response;
    try {
      response = await httpClient.post(
        `${apiModelsBaseUrl}${endpointPath}`,
        requestPayload
      );
    } catch (error) {
      throw createModelApiRequestError(
        error,
        "Alternative pairwise model execution failed"
      );
    }

    const result = unwrapModelApiResponse(
      response,
      "Alternative pairwise model execution failed"
    );

    if (!isPlainObject(result)) {
      throw createInternalError("ApiModels response payload must be an object", {
        field: "data",
      });
    }

    const requiredKeys = [
      "ranking",
      "rankedWithScores",
      "scoresByAlternative",
      "matrixUsed",
      "collectivePayload",
      "plotsGraphic",
      "consensusMeasure",
      "rawOutput",
    ];

    const missingKeys = requiredKeys.filter(
      (key) => !Object.prototype.hasOwnProperty.call(result, key)
    );
    if (missingKeys.length > 0) {
      throw createInternalError(
        "ApiModels response is missing required canonical output fields",
        {
          field: "data",
          details: {
            missingKeys,
          },
        }
      );
    }

    if (!Array.isArray(result.ranking)) {
      throw createInternalError("ApiModels response field 'ranking' must be an array", {
        field: "ranking",
      });
    }

    if (!Array.isArray(result.rankedWithScores)) {
      throw createInternalError(
        "ApiModels response field 'rankedWithScores' must be an array",
        {
          field: "rankedWithScores",
        }
      );
    }

    if (!isPlainObject(result.scoresByAlternative)) {
      throw createInternalError(
        "ApiModels response field 'scoresByAlternative' must be an object",
        {
          field: "scoresByAlternative",
        }
      );
    }

    if (!isPlainObject(result.matrixUsed)) {
      throw createInternalError(
        "ApiModels response field 'matrixUsed' must be an object",
        {
          field: "matrixUsed",
        }
      );
    }

    if (!isPlainObject(result.collectivePayload)) {
      throw createInternalError(
        "ApiModels response field 'collectivePayload' must be an object",
        {
          field: "collectivePayload",
        }
      );
    }

    if (!isPlainObject(result.plotsGraphic)) {
      throw createInternalError(
        "ApiModels response field 'plotsGraphic' must be an object",
        {
          field: "plotsGraphic",
        }
      );
    }

    if (
      typeof result.consensusMeasure !== "number" ||
      !Number.isFinite(result.consensusMeasure)
    ) {
      throw createInternalError(
        "ApiModels response field 'consensusMeasure' must be a finite number",
        {
          field: "consensusMeasure",
        }
      );
    }

    if (!isPlainObject(result.rawOutput)) {
      throw createInternalError(
        "ApiModels response field 'rawOutput' must be an object",
        {
          field: "rawOutput",
        }
      );
    }

    return {
      message: `Consensus round ${phase} for '${issue.name}' computed successfully.`,
      consensusMeasure: result.consensusMeasure,
      collectivePayload: result.collectivePayload || {},
      computedPayload: {
        ranking: result.ranking,
        rankedWithScores: result.rankedWithScores,
        scoresByAlternative: result.scoresByAlternative,
        matrixUsed: result.matrixUsed || {},
        plotsGraphic: result.plotsGraphic || {},
      },
      modelExecution: {
        kind: "apiModels",
        structureKey:
          EVALUATION_STRUCTURE_KEYS.ALTERNATIVE_PAIRWISE_BY_CRITERION,
        apiModelKey: model.apiModelKey,
        apiEndpointPath: endpointPath,
        executedAt: new Date(),
      },
      rawOutput: result.rawOutput || result,
    };
  },
});
