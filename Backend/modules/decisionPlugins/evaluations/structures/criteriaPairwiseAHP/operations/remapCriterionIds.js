import { createBadRequestError } from "../../../../../../utils/common/errors.js";
import { isPlainObject } from "../../../../../../utils/common/objects.js";
import { normalizeNonEmptyString } from "../../../../../../utils/common/strings.js";

const remapId = ({ sourceId, criterionIdMap, field }) => {
  const normalized = normalizeNonEmptyString(sourceId);
  const mapped = normalized ? normalizeNonEmptyString(criterionIdMap.get(normalized)) : null;
  if (!mapped) {
    throw createBadRequestError(
      "Unable to remap AHP evaluation to persisted criteria",
      { field, details: { criterionId: normalized } }
    );
  }
  return mapped;
};

export const remapCriteriaPairwiseAHPCriterionIds = ({ payload, criterionIdMap }) => {
  if (!isPlainObject(payload) || !Array.isArray(payload.comparisons)) {
    throw createBadRequestError("AHP payload must contain a comparisons array", {
      field: "payload.comparisons",
    });
  }
  if (!(criterionIdMap instanceof Map)) {
    throw createBadRequestError("criterionIdMap must be a Map", {
      field: "criterionIdMap",
    });
  }

  return {
    ...payload,
    comparisons: payload.comparisons.map((comparison, index) => {
      if (!isPlainObject(comparison)) {
        throw createBadRequestError("AHP comparison must be an object", {
          field: `payload.comparisons[${index}]`,
        });
      }
      return {
        ...comparison,
        criterionId: remapId({
          sourceId: comparison.criterionId,
          criterionIdMap,
          field: `payload.comparisons[${index}].criterionId`,
        }),
        comparedCriterionId: remapId({
          sourceId: comparison.comparedCriterionId,
          criterionIdMap,
          field: `payload.comparisons[${index}].comparedCriterionId`,
        }),
      };
    }),
  };
};
