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
  evaluationContext,
  requireValue,
}) => {
  if (!isPlainObject(payload)) {
    throw createBadRequestError("payload must be an object", {
      field: "payload",
    });
  }

  if (
    Object.prototype.hasOwnProperty.call(payload, "comparisonsByCriterion") ||
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

  const {
    alternatives,
    criteria,
    criterionIds,
  } = await resolveAlternativesAndCriteria({
    evaluationContext,
  });
  const expectedPairsByCriterion = buildExpectedPairsByCriterion({
    criteria,
    alternatives,
  });

  const unknownCriteriaKeys = Object.keys(payload).filter(
    (criterionId) => !criterionIds.includes(criterionId)
  );

  if (unknownCriteriaKeys.length > 0) {
    throw createBadRequestError(
      "payload contains unknown criterion keys",
      {
        field: "payload",
      }
    );
  }

  const alternativeIdSet = new Set(alternatives.map((alternative) => alternative.id));
  const comparisonsByCriterion = {};

  for (const criterionId of criterionIds) {
    const expectedPairsMeta = expectedPairsByCriterion[criterionId];
    const expectedExpressionDomain = expectedPairsMeta.expressionDomain;
    const incomingCriterionPayload = payload[criterionId];

    if (incomingCriterionPayload !== undefined && !isPlainObject(incomingCriterionPayload)) {
      throw createBadRequestError(
        `payload['${criterionId}'] must be an object`,
        {
          field: "payload",
        }
      );
    }

    const safeCriterionPayload = isPlainObject(incomingCriterionPayload)
      ? incomingCriterionPayload
      : {};
    const unknownRowKeys = Object.keys(safeCriterionPayload).filter(
      (alternativeId) => !alternativeIdSet.has(alternativeId)
    );

    if (unknownRowKeys.length > 0) {
      throw createBadRequestError(
        `payload['${criterionId}'] contains unknown alternative row keys`,
        {
          field: "payload",
        }
      );
    }

    comparisonsByCriterion[criterionId] = {};

    for (const rowAlternative of alternatives) {
      const rowPayload = safeCriterionPayload[rowAlternative.id];

      if (rowPayload !== undefined && !isPlainObject(rowPayload)) {
        throw createBadRequestError(
          `payload['${criterionId}']['${rowAlternative.id}'] must be an object`,
          {
            field: "payload",
          }
        );
      }

      const safeRowPayload = isPlainObject(rowPayload) ? rowPayload : {};
      const unknownColKeys = Object.keys(safeRowPayload).filter(
        (alternativeId) =>
          !alternativeIdSet.has(alternativeId) || alternativeId === rowAlternative.id
      );

      if (unknownColKeys.length > 0) {
        throw createBadRequestError(
          `payload['${criterionId}']['${rowAlternative.id}'] contains unknown alternative column keys`,
          {
            field: "payload",
          }
        );
      }

      comparisonsByCriterion[criterionId][rowAlternative.id] = {};

      for (const colAlternative of alternatives) {
        if (rowAlternative.id === colAlternative.id) {
          continue;
        }

        const cell = safeRowPayload[colAlternative.id];

        comparisonsByCriterion[criterionId][rowAlternative.id][colAlternative.id] =
          cell === undefined
            ? buildEmptyCell(expectedExpressionDomain)
            : normalizeCellOrThrow({
                cell,
                requireValue,
                field: "payload",
                expectedExpressionDomain,
              });
      }
    }
  }

  return comparisonsByCriterion;
};
