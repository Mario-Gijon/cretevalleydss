import {
  normalizeManualCriteriaWeights,
} from "./operations/normalizeManualCriteriaWeights.js";
import {
  resolveManualWeightsAllowEmptyOrThrow,
  validateSubmittedManualWeightsOrThrow,
} from "./operations/validateManualCriteriaWeights.js";

export const saveManualCriteriaWeightsPayload = async ({
  payload,
  decisionContext,
  mode,
}) => {
  const allowEmpty = resolveManualWeightsAllowEmptyOrThrow(mode);

  const normalized = await normalizeManualCriteriaWeights({
    payload,
    decisionContext,
    allowEmpty,
  });

  if (mode === "submit") {
    validateSubmittedManualWeightsOrThrow({
      weightsByCriterion: normalized.payload.weightsByCriterion,
      criteria: normalized.criteria,
    });
  }

  return normalized.payload;
};
