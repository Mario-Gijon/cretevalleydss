import { createBadRequestError } from "../../../../../../utils/common/errors.js";
import {
  hasOwnKey,
  isPlainObject,
} from "../../../../../../utils/common/objects.js";
import { normalizeNonEmptyString } from "../../../../../../utils/common/strings.js";
import { resolveCriteria } from "./resolveCriteria.js";

export const normalizePayload = ({
  payload,
  decisionContext,
  requireValue,
}) => {
  const criterionIds = resolveCriteria({ decisionContext });

  if (!isPlainObject(payload)) {
    throw createBadRequestError(
      "criteriaPreferenceOrder payload must be an object",
      {
        field: "payload",
      }
    );
  }

  if (!hasOwnKey(payload, "criterionOrder")) {
    throw createBadRequestError(
      "criteriaPreferenceOrder criterionOrder is required",
      {
        field: "payload.criterionOrder",
      }
    );
  }

  if (!Array.isArray(payload.criterionOrder)) {
    throw createBadRequestError(
      "criteriaPreferenceOrder criterionOrder must be an array",
      {
        field: "payload.criterionOrder",
      }
    );
  }

  const validCriterionIds = new Set(criterionIds);
  const seenCriterionIds = new Set();

  const criterionOrder = payload.criterionOrder.map((criterionId, index) => {
    const normalizedCriterionId = normalizeNonEmptyString(criterionId);

    if (!normalizedCriterionId) {
      throw createBadRequestError(
        "criteriaPreferenceOrder criterion id must be a non-empty string",
        {
          field: `payload.criterionOrder[${index}]`,
        }
      );
    }

    if (!validCriterionIds.has(normalizedCriterionId)) {
      throw createBadRequestError(
        "criteriaPreferenceOrder contains an unknown criterion id",
        {
          field: `payload.criterionOrder[${index}]`,
          details: {
            criterionId: normalizedCriterionId,
          },
        }
      );
    }

    if (seenCriterionIds.has(normalizedCriterionId)) {
      throw createBadRequestError(
        "criteriaPreferenceOrder criterion ids must be unique",
        {
          field: `payload.criterionOrder[${index}]`,
          details: {
            criterionId: normalizedCriterionId,
          },
        }
      );
    }

    seenCriterionIds.add(normalizedCriterionId);

    return normalizedCriterionId;
  });

  if (requireValue && criterionOrder.length !== criterionIds.length) {
    throw createBadRequestError(
      "criteriaPreferenceOrder must contain every current leaf criterion exactly once",
      {
        field: "payload.criterionOrder",
      }
    );
  }

  return {
    criterionOrder,
  };
};