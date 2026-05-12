import {
  EVALUATION_STAGES,
  EVALUATION_STRUCTURE_KEYS,
} from "../../evaluation.constants.js";
import {
  getDefaultIssueExpressionDomainSnapshotOrThrow,
  getOrderedAlternativeAndCriterionNames,
  serializeIssueExpressionDomainSnapshot,
} from "../shared/alternativeEvaluation.helpers.js";
import { IssueModel } from "../../../../../models/IssueModels.js";
import {
  createModelApiRequestError,
  unwrapModelApiResponse,
} from "../../../../../services/modelApi/modelResponse.js";
import { createBadRequestError, createInternalError } from "../../../../../utils/common/errors.js";

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const buildCellKey = (alternativeName, criterionName) =>
  `${alternativeName}::${criterionName}`;

const buildEmptyCell = (expressionDomain = null) => ({
  value: "",
  expressionDomain,
});

const normalizeText = (value) =>
  typeof value === "string" ? value.trim() : "";

const normalizeExpressionDomainOrThrow = ({ expressionDomain, field }) => {
  const serialized = serializeIssueExpressionDomainSnapshot(expressionDomain);

  if (!serialized || !serialized.type || !serialized.name) {
    throw createBadRequestError("Cell expressionDomain is invalid", {
      field,
    });
  }

  return serialized;
};

const validateCellValueByDomainOrThrow = ({
  value,
  expressionDomain,
  field,
}) => {
  const domainType = expressionDomain?.type;

  if (domainType === "numeric") {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
      throw createBadRequestError("Numeric cell value must be finite", { field });
    }

    const min = expressionDomain?.numericRange?.min;
    const max = expressionDomain?.numericRange?.max;

    if (Number.isFinite(min) && numericValue < min) {
      throw createBadRequestError(
        `Numeric cell value must be greater than or equal to ${min}`,
        { field }
      );
    }

    if (Number.isFinite(max) && numericValue > max) {
      throw createBadRequestError(
        `Numeric cell value must be lower than or equal to ${max}`,
        { field }
      );
    }

    return numericValue;
  }

  if (domainType === "linguistic") {
    const labelValue = normalizeText(value);
    const allowedLabels = Array.isArray(expressionDomain?.linguisticLabels)
      ? expressionDomain.linguisticLabels
          .map((entry) => normalizeText(entry?.label))
          .filter(Boolean)
      : [];

    if (allowedLabels.length === 0) {
      throw createBadRequestError(
        "Linguistic expression domain does not define labels",
        { field }
      );
    }

    if (!allowedLabels.includes(labelValue)) {
      throw createBadRequestError(
        "Linguistic cell value must match one of the configured labels",
        { field }
      );
    }

    return labelValue;
  }

  throw createBadRequestError(
    `Unsupported expression domain type: ${String(domainType || "unknown")}`,
    { field }
  );
};

const normalizeCellOrThrow = ({
  cell,
  requireValue,
  field,
  defaultExpressionDomain,
}) => {
  if (!isPlainObject(cell)) {
    throw createBadRequestError("Cell must be an object", { field });
  }

  const rawValue = cell.value;
  const rawExpressionDomain = cell.expressionDomain;
  const hasValue = !(rawValue === "" || rawValue === null || rawValue === undefined);
  const hydratedExpressionDomain = normalizeExpressionDomainOrThrow({
    expressionDomain:
      isPlainObject(rawExpressionDomain) ? rawExpressionDomain : defaultExpressionDomain,
    field,
  });

  if (!hasValue) {
    if (requireValue) {
      throw createBadRequestError("All cells must include a value for submit", {
        field,
      });
    }

    return {
      value: "",
      expressionDomain: hydratedExpressionDomain,
    };
  }

  const normalizedValue = validateCellValueByDomainOrThrow({
    value: rawValue,
    expressionDomain: hydratedExpressionDomain,
    field,
  });

  return {
    value: normalizedValue,
    expressionDomain: hydratedExpressionDomain,
  };
};

const buildExpectedCellKeys = ({ alternativeNames, criterionNames }) => {
  const expectedKeys = [];

  for (const alternativeName of alternativeNames) {
    for (const criterionName of criterionNames) {
      expectedKeys.push(buildCellKey(alternativeName, criterionName));
    }
  }

  return expectedKeys;
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
    throw createBadRequestError("Unsupported alternative criteria matrix payload shape", {
      field: "payload",
    });
  }

  if (!isPlainObject(payload.cells)) {
    throw createBadRequestError("payload.cells must be an object", {
      field: "payload.cells",
    });
  }

  const { alternativeNames, criterionNames } =
    await getOrderedAlternativeAndCriterionNames({ issue });
  const defaultExpressionDomain =
    await getDefaultIssueExpressionDomainSnapshotOrThrow({ issue });
  const expectedCellKeys = buildExpectedCellKeys({
    alternativeNames,
    criterionNames,
  });
  const expectedCellKeySet = new Set(expectedCellKeys);

  const incomingCellKeys = Object.keys(payload.cells);
  const unknownCellKeys = incomingCellKeys.filter(
    (cellKey) => !expectedCellKeySet.has(cellKey)
  );

  if (unknownCellKeys.length > 0) {
    throw createBadRequestError("payload.cells contains unknown cell keys", {
      field: "payload.cells",
    });
  }

  const cells = expectedCellKeys.reduce((accumulator, cellKey) => {
    const cell = payload.cells[cellKey];

    accumulator[cellKey] =
      cell === undefined
        ? buildEmptyCell(defaultExpressionDomain)
        : normalizeCellOrThrow({
            cell,
            requireValue,
            field: "payload.cells",
            defaultExpressionDomain,
          });

    return accumulator;
  }, {});

  return {
    cells,
  };
};

const buildGetPayload = async ({ storedEvaluation, issue }) => {
  const { alternativeNames, criterionNames } =
    await getOrderedAlternativeAndCriterionNames({ issue });
  const defaultExpressionDomain =
    await getDefaultIssueExpressionDomainSnapshotOrThrow({ issue });
  const expectedCellKeys = buildExpectedCellKeys({
    alternativeNames,
    criterionNames,
  });

  const storedCells = isPlainObject(storedEvaluation?.payload?.cells)
    ? storedEvaluation.payload.cells
    : {};

  const cells = expectedCellKeys.reduce((accumulator, cellKey) => {
    const storedCell = storedCells[cellKey];

    if (!isPlainObject(storedCell)) {
      accumulator[cellKey] = {
        value: "",
        expressionDomain: defaultExpressionDomain,
      };
      return accumulator;
    }

    const hydratedExpressionDomain = normalizeExpressionDomainOrThrow({
      expressionDomain:
        isPlainObject(storedCell.expressionDomain)
          ? storedCell.expressionDomain
          : defaultExpressionDomain,
      field: "payload.cells",
    });

    accumulator[cellKey] = {
      value:
        storedCell.value === "" ||
        storedCell.value === null ||
        storedCell.value === undefined
          ? ""
          : validateCellValueByDomainOrThrow({
              value: storedCell.value,
              expressionDomain: hydratedExpressionDomain,
              field: "payload.cells",
            }),
      expressionDomain: hydratedExpressionDomain,
    };

    return accumulator;
  }, {});

  return { cells };
};

export const alternativeCriteriaMatrixStructure = Object.freeze({
  key: EVALUATION_STRUCTURE_KEYS.ALTERNATIVE_CRITERIA_MATRIX,
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
    if (issue?.isConsensus === true) {
      throw createBadRequestError(
        "Consensus alternative matrix computation is not implemented yet",
        {
          field: "isConsensus",
        }
      );
    }

    const { alternatives, criteria } =
      await getOrderedAlternativeAndCriterionNames({ issue });

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

    if (!model?.apiEndpoint?.path) {
      throw createBadRequestError("Issue model is missing apiEndpoint.path", {
        field: "apiEndpoint.path",
      });
    }

    if (
      model?.alternativeEvaluationStructureKey !==
      EVALUATION_STRUCTURE_KEYS.ALTERNATIVE_CRITERIA_MATRIX
    ) {
      throw createBadRequestError(
        "Issue model does not support alternativeCriteriaMatrix structure",
        {
          field: "alternativeEvaluationStructureKey",
        }
      );
    }

    const endpointPath = model.apiEndpoint.path.startsWith("/")
      ? model.apiEndpoint.path
      : `/${model.apiEndpoint.path}`;

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
        "Alternative evaluation model execution failed"
      );
    }

    const result = unwrapModelApiResponse(
      response,
      "Alternative evaluation model execution failed"
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

    return {
      message: `Issue '${issue.name}' computed successfully.`,
      consensusMeasure: result.consensusMeasure ?? null,
      collectivePayload: result.collectivePayload ?? {},
      computedPayload: {
        ranking: result.ranking,
        rankedWithScores: result.rankedWithScores,
        scoresByAlternative: result.scoresByAlternative,
        matrixUsed: result.matrixUsed ?? {},
        plotsGraphic: result.plotsGraphic ?? {},
      },
      modelExecution: {
        kind: "apiModels",
        structureKey: EVALUATION_STRUCTURE_KEYS.ALTERNATIVE_CRITERIA_MATRIX,
        apiModelKey: model.apiModelKey,
        apiEndpointPath: endpointPath,
        executedAt: new Date(),
      },
      rawOutput: result.rawOutput ?? result,
      issueUpdates: {
        active: false,
      },
      nextCurrentStage: "finished",
    };
  },
});
