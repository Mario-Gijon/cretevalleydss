import {
  EVALUATION_STAGES,
} from "../../evaluationStages.js";
import { buildGetPayload } from "./manualCriteriaWeights.getPayload.js";
import {
  normalizeManualPayloadOrThrow,
  resolveAllowEmptyFromModeOrThrow,
  validateSubmittedManualWeightsOrThrow,
} from "./manualCriteriaWeights.payload.js";

export const manualCriteriaWeightsStructure = Object.freeze({
  key: "manualCriteriaWeights",
  label: "Manual weights",
  stage: EVALUATION_STAGES.CRITERIA_WEIGHTING,
  async get({ payload: storedPayload, evaluationContext }) {
    const { payload } = await buildGetPayload({
      payload: storedPayload,
      evaluationContext,
    });
    return payload;
  },

  async save({ mode, payload, evaluationContext }) {
    const allowEmpty = resolveAllowEmptyFromModeOrThrow(mode);

    const normalized = await normalizeManualPayloadOrThrow({
      payload,
      evaluationContext,
      allowEmpty,
    });

    if (mode === "submit") {
      validateSubmittedManualWeightsOrThrow({
        weightsByCriterion: normalized.payload.weightsByCriterion,
        criterionNames: normalized.criterionNames,
      });
    }

    return normalized.payload;
  },
});
