import { createBadRequestError } from "../../../utils/common/errors.js";
import { EVALUATION_STRUCTURE_KEYS } from "../evaluations/evaluation.constants.js";

const CRITERIA_WEIGHTING_API_ENDPOINTS = Object.freeze({
  [EVALUATION_STRUCTURE_KEYS.BEST_WORST_CRITERIA]: {
    apiModelKey: "bwm",
    apiEndpointPath: "/bwm",
  },
});

export const resolveCriteriaWeightingApiEndpointOrThrow = (structureKey) => {
  const endpoint = CRITERIA_WEIGHTING_API_ENDPOINTS[structureKey];

  if (!endpoint) {
    throw createBadRequestError(
      `No ApiModels endpoint configured for criteria weighting structure '${structureKey || "unknown"}'`,
      { field: "structureKey" }
    );
  }

  return endpoint;
};
