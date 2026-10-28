import { createBadRequestError } from "../../../../../../utils/common/errors.js";
import { isPlainObject } from "../../../../../../utils/common/objects.js";
import { normalizeNonEmptyString } from "../../../../../../utils/common/strings.js";

const remapRows = ({ rows, field, criterionIdMap }) => {
  if (!Array.isArray(rows)) {
    throw createBadRequestError(`${field} must be an array`, { field });
  }
  return rows.map((row, index) => {
    if (!isPlainObject(row)) {
      throw createBadRequestError(`${field}[${index}] must be an object`, {
        field: `${field}[${index}]`,
      });
    }
    const criterionId = normalizeNonEmptyString(row.criterionId);
    const persistedCriterionId = criterionId
      ? normalizeNonEmptyString(criterionIdMap.get(criterionId))
      : null;
    if (!persistedCriterionId) {
      throw createBadRequestError(
        "Unable to remap AHPSort I evaluation to persisted criteria",
        {
          field: `${field}[${index}].criterionId`,
          details: { criterionId },
        }
      );
    }
    return { ...row, criterionId: persistedCriterionId };
  });
};

export const remapAHPSortAlternativeProfilesCriterionIds = ({
  payload,
  criterionIdMap,
}) => {
  if (!isPlainObject(payload)) {
    throw createBadRequestError("AHPSort I evaluation payload must be an object", {
      field: "payload",
    });
  }
  if (!(criterionIdMap instanceof Map)) {
    throw createBadRequestError("criterionIdMap must be a Map", {
      field: "criterionIdMap",
    });
  }
  return {
    ...payload,
    alternativeProfileComparisons: remapRows({
      rows: payload.alternativeProfileComparisons,
      field: "payload.alternativeProfileComparisons",
      criterionIdMap,
    }),
    profileComparisons: remapRows({
      rows: payload.profileComparisons,
      field: "payload.profileComparisons",
      criterionIdMap,
    }),
  };
};
