import { createBadRequestError } from "../../../../../utils/common/errors.js";
import { isPlainObject } from "../../../../../utils/common/objects.js";
import {
  buildEmptyExpressionDomainEvaluationValue,
  normalizeExpressionDomainEvaluationValueOrThrow,
  resolveRequireValueFromModeOrThrow,
  validateExpressionDomainEvaluationValueOrThrow,
} from "../../shared/expressionDomainEvaluationPayload.js";
import { resolveAlternativesAndCriteria } from "./alternativeCriteriaMatrix.context.js";

export const buildEmptyCell = buildEmptyExpressionDomainEvaluationValue;
export const validateCellValueByDomainOrThrow =
  validateExpressionDomainEvaluationValueOrThrow;
export { resolveRequireValueFromModeOrThrow };

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
          : normalizeExpressionDomainEvaluationValueOrThrow({
              cell,
              requireValue,
              field: "payload",
              expectedExpressionDomain: criterion.expressionDomain,
              emptyValueMessage: "All cells must include a value for submit",
              invalidValueMessage: "Cell must be an object",
            });
    }
  }

  return normalizedPayload;
};
