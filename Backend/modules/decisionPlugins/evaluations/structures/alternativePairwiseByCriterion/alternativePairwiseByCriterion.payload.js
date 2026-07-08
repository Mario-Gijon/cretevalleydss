import { createBadRequestError } from "../../../../../utils/common/errors.js";
import { isPlainObject } from "../../../../../utils/common/objects.js";
import {
  buildEmptyExpressionDomainEvaluationValue,
  normalizeExpressionDomainEvaluationValueOrThrow,
  resolveRequireValueFromModeOrThrow,
  validateExpressionDomainEvaluationValueOrThrow,
} from "../../shared/expressionDomainEvaluationPayload.js";
import {
  buildExpectedPairsByCriterion,
  resolveAlternativesAndCriteria,
} from "./alternativePairwiseByCriterion.context.js";

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
            : normalizeExpressionDomainEvaluationValueOrThrow({
                cell,
                requireValue,
                field: "payload",
                expectedExpressionDomain,
                emptyValueMessage: "All comparisons must include a value for submit",
                invalidValueMessage: "Comparison cell must be an object",
              });
      }
    }
  }

  return comparisonsByCriterion;
};
