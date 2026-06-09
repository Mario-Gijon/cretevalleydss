import {
  EVALUATION_STAGES,
} from "../../evaluation.constants.js";
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
  async get({ storedEvaluation, structureContext }) {
    const { payload } = await buildGetPayload({
      storedEvaluation,
      structureContext,
    });
    return payload;
  },

  async save({ mode, payload, structureContext }) {
    const allowEmpty = resolveAllowEmptyFromModeOrThrow(mode);

    const normalized = await normalizeManualPayloadOrThrow({
      payload,
      structureContext,
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
