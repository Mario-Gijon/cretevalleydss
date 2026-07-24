import { createBadRequestError } from "../../../../../../utils/common/errors.js";
import { hasOwnKey, isPlainObject } from "../../../../../../utils/common/objects.js";
import { validateExpressionDomainEvaluationOrThrow } from "../../../../../expressionDomains/validateExpressionDomainEvaluation.js";
import { resolveAlternativeCriteriaMatrixItems } from "./resolveAlternativeCriteriaMatrixItems.js";

const normalizeEvaluationValueOrThrow = ({
  value,
  field,
  requireValue,
  expressionDomain,
}) => {
  if (value === undefined || value === null) {
    throw createBadRequestError("Matrix evaluation value is invalid.", {
      field,
    });
  }

  if (value === "") {
    if (requireValue) {
      throw createBadRequestError("All matrix evaluations must include a value for submit.", {
        field,
      });
    }

    return "";
  }

  return validateExpressionDomainEvaluationOrThrow({
    value,
    expressionDomain,
  });
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

export const normalizeAlternativeCriteriaMatrix = async ({
  payload,
  decisionContext,
  requireValue,
}) => {
  if (!isPlainObject(payload)) {
    throw createBadRequestError("payload must be an object", {
      field: "payload",
    });
  }

  const {
    alternatives,
    criteria,
  } = await resolveAlternativeCriteriaMatrixItems({
    decisionContext,
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
      normalizedPayload[alternative.id][criterion.id] = normalizeEvaluationValueOrThrow({
        value: alternativeRow[criterion.id],
        field: `payload.${alternative.id}.${criterion.id}`,
        requireValue,
        expressionDomain: criterion.expressionDomain,
      });
    }
  }

  return normalizedPayload;
};
