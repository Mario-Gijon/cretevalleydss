import { createBadRequestError } from "../../../../../utils/common/errors.js";
import { isPlainObject } from "../../../../../utils/common/objects.js";
import { resolveAlternativesAndCriteria } from "./alternativeCriteriaMatrix.context.js";

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
  expectedExpressionDomain,
}) => {
  if (!isPlainObject(cell)) {
    throw createBadRequestError("Cell must be an object", { field });
  }

  const rawValue = cell.value;
  const hasValue = !(rawValue === "" || rawValue === null || rawValue === undefined);

  if (!hasValue) {
    if (requireValue) {
      throw createBadRequestError("All cells must include a value for submit", {
        field,
      });
    }

    return {
      value: "",
      expressionDomain: expectedExpressionDomain,
    };
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
    Object.prototype.hasOwnProperty.call(payload, "cells") ||
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

  const {
    alternatives,
    criteria,
  } = await resolveAlternativesAndCriteria({
    evaluationContext,
  });

  const expectedAlternativeIdSet = new Set(alternatives.map((alternative) => alternative.id));
  const expectedCriterionIdSet = new Set(criteria.map((criterion) => criterion.id));
  const unknownAlternativeKeys = Object.keys(payload).filter(
    (alternativeId) => !expectedAlternativeIdSet.has(alternativeId)
  );

  if (unknownAlternativeKeys.length > 0) {
    throw createBadRequestError("payload contains unknown alternative keys", {
      field: "payload",
    });
  }

  const normalizedPayload = {};

  for (const alternative of alternatives) {
    const alternativeRow = payload[alternative.id];

    if (alternativeRow !== undefined && !isPlainObject(alternativeRow)) {
      throw createBadRequestError(
        `payload['${alternative.id}'] must be an object`,
        {
          field: "payload",
        }
      );
    }

    const safeAlternativeRow = isPlainObject(alternativeRow) ? alternativeRow : {};
    const unknownCriterionKeys = Object.keys(safeAlternativeRow).filter(
      (criterionId) => !expectedCriterionIdSet.has(criterionId)
    );

    if (unknownCriterionKeys.length > 0) {
      throw createBadRequestError(
        `payload['${alternative.id}'] contains unknown criterion keys`,
        {
          field: "payload",
        }
      );
    }

    normalizedPayload[alternative.id] = {};

    for (const criterion of criteria) {
      const cell = safeAlternativeRow[criterion.id];

      normalizedPayload[alternative.id][criterion.id] =
        cell === undefined
          ? buildEmptyCell(criterion.expressionDomain)
          : normalizeCellOrThrow({
              cell,
              requireValue,
              field: "payload",
              expectedExpressionDomain: criterion.expressionDomain,
            });
    }
  }

  return normalizedPayload;
};
