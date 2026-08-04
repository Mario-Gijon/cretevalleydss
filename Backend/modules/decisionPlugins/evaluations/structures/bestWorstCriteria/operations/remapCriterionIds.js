import { createBadRequestError } from "../../../../../../utils/common/errors.js";
import { isPlainObject } from "../../../../../../utils/common/objects.js";
import { normalizeNonEmptyString } from "../../../../../../utils/common/strings.js";

const remapCriterionIdOrThrow = ({ criterionId, criterionIdMap, field }) => {
  const normalizedCriterionId = normalizeNonEmptyString(criterionId);
  if (!normalizedCriterionId) {
    throw createBadRequestError("Criterion id is required for criteria weighting payload", {
      field,
    });
  }

  const mappedCriterionId = normalizeNonEmptyString(
    criterionIdMap.get(normalizedCriterionId)
  );
  if (!mappedCriterionId) {
    throw createBadRequestError(
      "Unable to remap criteria weighting payload to persisted criteria",
      {
        field,
        details: { criterionId: normalizedCriterionId },
      }
    );
  }

  return mappedCriterionId;
};

const remapComparisonsOrThrow = ({ comparisons, criterionIdMap, field }) => {
  if (!isPlainObject(comparisons)) {
    throw createBadRequestError(`${field} must be an object`, { field });
  }

  return Object.fromEntries(
    Object.entries(comparisons).map(([criterionId, value]) => [
      remapCriterionIdOrThrow({
        criterionId,
        criterionIdMap,
        field: `${field}.${criterionId}`,
      }),
      value,
    ])
  );
};

export const remapBestWorstCriteriaCriterionIds = ({
  payload,
  criterionIdMap,
}) => {
  if (!isPlainObject(payload)) {
    throw createBadRequestError("criteriaWeightingConfig.payload must be an object", {
      field: "criteriaWeightingConfig.payload",
    });
  }

  if (!(criterionIdMap instanceof Map)) {
    throw createBadRequestError("criterionIdMap must be a Map", {
      field: "criterionIdMap",
    });
  }

  return {
    bestCriterionId: remapCriterionIdOrThrow({
      criterionId: payload.bestCriterionId,
      criterionIdMap,
      field: "criteriaWeightingConfig.payload.bestCriterionId",
    }),
    worstCriterionId: remapCriterionIdOrThrow({
      criterionId: payload.worstCriterionId,
      criterionIdMap,
      field: "criteriaWeightingConfig.payload.worstCriterionId",
    }),
    bestToOthers: remapComparisonsOrThrow({
      comparisons: payload.bestToOthers,
      criterionIdMap,
      field: "criteriaWeightingConfig.payload.bestToOthers",
    }),
    othersToWorst: remapComparisonsOrThrow({
      comparisons: payload.othersToWorst,
      criterionIdMap,
      field: "criteriaWeightingConfig.payload.othersToWorst",
    }),
  };
};
