import { createBadRequestError } from "../../../../../utils/common/errors.js";
import { validateExpressionDomainEvaluationOrThrow } from "../../../../expressionDomains/validateExpressionDomainEvaluation.js";
import { isPlainObject } from "../../../../../utils/common/objects.js";
import {
  buildExpectedPairsByCriterion,
  resolveAlternativesAndCriteria,
} from "./alternativePairwiseByCriterion.context.js";

export const buildEmptyCell = (expressionDomain = null) => ({
  value: "",
  expressionDomain,
});

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
}) => {
  return validateExpressionDomainEvaluationOrThrow({
    value,
    expressionDomain,
  });
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
