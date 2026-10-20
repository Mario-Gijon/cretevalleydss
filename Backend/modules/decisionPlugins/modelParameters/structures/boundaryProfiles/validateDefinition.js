import {
  validateAndNormalizeBoundaryProfiles,
  validateBoundaryProfileRestrictions,
} from "./validateAndNormalize.js";

export const validateBoundaryProfilesDefinition = (parameter) => {
  const restrictions = validateBoundaryProfileRestrictions(parameter);
  if (restrictions.error) return restrictions.error;
  if (parameter?.default === undefined) return null;
  const result = validateAndNormalizeBoundaryProfiles({
    value: parameter.default,
    parameter,
    context: {
      leafCriteria: Object.keys(
        parameter.default?.profiles?.[0]?.valuesByCriterionId || {}
      ).map((id) => ({ id })),
    },
  });
  return result.ok ? null : `default ${result.message}`;
};
