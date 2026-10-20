import { createBadRequestError } from "../../../../../utils/common/errors.js";
import { isPlainObject } from "../../../../../utils/common/objects.js";
import { remapCriterionKeyedParameterValueOrThrow } from "../../criterionParameterRemapping.js";

export const remapBoundaryProfileCriterionIds = ({
  value,
  criterionIdMap,
  parameter,
}) => {
  if (!isPlainObject(value) || !Array.isArray(value.profiles)) {
    throw createBadRequestError(
      "Boundary profiles must be an object containing a profiles array",
      { field: `modelParameters.${parameter?.key || "<unknown>"}` }
    );
  }

  return {
    profiles: value.profiles.map((profile, index) => ({
      ...profile,
      valuesByCriterionId: remapCriterionKeyedParameterValueOrThrow({
        value: profile?.valuesByCriterionId,
        criterionIdMap,
        parameter: {
          ...parameter,
          key: `${parameter?.key || "<unknown>"}.profiles[${index}].valuesByCriterionId`,
        },
      }),
    })),
  };
};
