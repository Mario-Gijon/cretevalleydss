import { createBadRequestError } from "../../../../../utils/common/errors.js";
import { hasOwnKey, isPlainObject } from "../../../../../utils/common/objects.js";
import {
  resolveRequireValueFromModeOrThrow,
} from "../../shared/expressionDomainEvaluationPayload.js";
import { validateExpressionDomainEvaluationOrThrow } from "../../../../expressionDomains/validateExpressionDomainEvaluation.js";
import { resolveAlternativesAndCriteria } from "./alternativeCriteriaMatrix.context.js";

export const buildEmptyCell = () => ({
  value: "",
});
export { resolveRequireValueFromModeOrThrow };

const rejectUnsupportedTopLevelShapesOrThrow = (payload) => {
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
};

const requireCanonicalCellOrThrow = ({
  cell,
  field,
  requireValue,
  expressionDomain,
}) => {
  if (!isPlainObject(cell)) {
    throw createBadRequestError("Matrix cell must be an object.", {
      field,
    });
  }

  const keys = Object.keys(cell);

  if (keys.length !== 1 || !hasOwnKey(cell, "value")) {
    throw createBadRequestError("Matrix cell must contain exactly the key 'value'.", {
      field,
    });
  }

  if (cell.value === undefined || cell.value === null) {
    throw createBadRequestError("Matrix cell value is invalid.", {
      field: `${field}.value`,
    });
  }

  if (cell.value === "") {
    if (requireValue) {
      throw createBadRequestError("All cells must include a value for submit.", {
        field: `${field}.value`,
      });
    }

    return buildEmptyCell();
  }

  return {
    value: validateExpressionDomainEvaluationOrThrow({
      value: cell.value,
      expressionDomain,
    }),
  };
};

const requireCanonicalShapeOrThrow = ({
  payload,
  alternatives,
  criteria,
}) => {
  const alternativeIds = alternatives.map((alternative) => alternative.id);
  const criterionIds = criteria.map((criterion) => criterion.id);
  const unknownAlternativeKeys = Object.keys(payload).filter(
    (alternativeId) => !alternativeIds.includes(alternativeId)
  );

  if (unknownAlternativeKeys.length > 0) {
    throw createBadRequestError("payload contains unknown alternative rows", {
      field: "payload",
    });
  }

  for (const alternative of alternatives) {
    if (!hasOwnKey(payload, alternative.id)) {
      throw createBadRequestError("payload is missing an alternative row.", {
        field: `payload.${alternative.id}`,
      });
    }

    const rowPayload = payload[alternative.id];

    if (!isPlainObject(rowPayload)) {
      throw createBadRequestError("Alternative criteria row must be an object.", {
        field: `payload.${alternative.id}`,
      });
    }

    const unknownCriterionKeys = Object.keys(rowPayload).filter(
      (criterionId) => !criterionIds.includes(criterionId)
    );

    if (unknownCriterionKeys.length > 0) {
      throw createBadRequestError("Alternative criteria row contains unknown criterion cells.", {
        field: `payload.${alternative.id}`,
      });
    }

    for (const criterion of criteria) {
      if (!hasOwnKey(rowPayload, criterion.id)) {
        throw createBadRequestError("Alternative criteria row is missing a criterion cell.", {
          field: `payload.${alternative.id}.${criterion.id}`,
        });
      }
    }
  }
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

  rejectUnsupportedTopLevelShapesOrThrow(payload);

  const {
    alternatives,
    criteria,
  } = await resolveAlternativesAndCriteria({
    evaluationContext,
  });
  requireCanonicalShapeOrThrow({
    payload,
    alternatives,
    criteria,
  });

  const normalizedPayload = {};

  for (const alternative of alternatives) {
    const alternativeRow = payload[alternative.id];

    normalizedPayload[alternative.id] = {};

    for (const criterion of criteria) {
      normalizedPayload[alternative.id][criterion.id] = requireCanonicalCellOrThrow({
        cell: alternativeRow[criterion.id],
        field: `payload.${alternative.id}.${criterion.id}`,
        requireValue,
        expressionDomain: criterion.expressionDomain,
      });
    }
  }

  return normalizedPayload;
};
