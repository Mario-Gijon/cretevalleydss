import { createBadRequestError } from "../../../../../utils/common/errors.js";
import { isPlainObject } from "../../../../../utils/common/objects.js";
import {
  buildExpectedPairsByCriterion,
  resolveAlternativesAndCriteria,
} from "./alternativePairwiseByCriterion.context.js";

export const buildEmptyCell = (expressionDomain = null) => ({
  value: "",
  expressionDomain,
});

export const normalizeText = (value) =>
  typeof value === "string" ? value.trim() : "";

const EVALUATION_SAVE_MODES = Object.freeze({
  DRAFT: "draft",
  SUBMIT: "submit",
});

export const resolveRequireValueFromModeOrThrow = (mode) => {
  if (mode === EVALUATION_SAVE_MODES.DRAFT) {
    return false;
  }

  if (mode === EVALUATION_SAVE_MODES.SUBMIT) {
    return true;
  }

  throw createBadRequestError("Unsupported evaluation save mode", {
    field: "mode",
  });
};

export const validateCellValueByDomainOrThrow = ({
  value,
  expressionDomain,
  field,
}) => {
  const domainType = expressionDomain?.type;

  if (domainType === "numeric") {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
      throw createBadRequestError("Pairwise value must be numeric", { field });
    }

    const min = expressionDomain?.numericRange?.min;
    const max = expressionDomain?.numericRange?.max;

    if (Number.isFinite(min) && numericValue < min) {
      throw createBadRequestError(
        `Pairwise value must be greater than or equal to ${min}`,
        { field }
      );
    }

    if (Number.isFinite(max) && numericValue > max) {
      throw createBadRequestError(
        `Pairwise value must be lower than or equal to ${max}`,
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
        "Linguistic pairwise value must match one of the configured labels",
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
  expectedExpressionDomain,
}) => {
  if (!isPlainObject(cell)) {
    throw createBadRequestError("Comparison cell must be an object", { field });
  }

  const rawValue = cell.value;
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
    return buildEmptyCell(expectedExpressionDomain);
  }

  const normalizedValue = validateCellValueByDomainOrThrow({
    value: rawValue,
    expressionDomain: expectedExpressionDomain,
    field,
  });

  return {
    value: normalizedValue,
    expressionDomain: expectedExpressionDomain,
  };
};

export const normalizePayloadOrThrow = async ({
  payload,
  issue,
  requireValue,
  alternatives,
  criteria,
}) => {
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

  const {
    alternativeNames,
    criteria: resolvedCriteria,
    criterionNames,
  } = await resolveAlternativesAndCriteria({
    issue,
    alternatives,
    criteria,
  });
  const expectedPairsByCriterion = buildExpectedPairsByCriterion({
    criteria: resolvedCriteria,
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
    const expectedPairsMeta = expectedPairsByCriterion[criterionName];
    const expectedPairs = expectedPairsMeta.pairs;
    const expectedExpressionDomain = expectedPairsMeta.expressionDomain;
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
            ? buildEmptyCell(expectedExpressionDomain)
            : normalizeCellOrThrow({
                cell,
                requireValue,
                field: "payload.comparisonsByCriterion",
                expectedExpressionDomain,
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
