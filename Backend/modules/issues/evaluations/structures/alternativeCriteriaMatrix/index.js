import {
  EVALUATION_STAGES,
  EVALUATION_STRUCTURE_KEYS,
} from "../../evaluation.constants.js";
import {
  getDefaultIssueExpressionDomainSnapshotOrThrow,
  getOrderedAlternativeAndCriterionNames,
  serializeIssueExpressionDomainSnapshot,
} from "../shared/alternativeEvaluation.helpers.js";
import { createBadRequestError } from "../../../../../utils/common/errors.js";

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

  async validateIssueCompatibility({ issue }) {
    if (issue?.isConsensus === true) {
      throw createBadRequestError(
        "Consensus alternative matrix computation is not implemented yet",
        {
          field: "isConsensus",
        }
      );
    }
  },
});
