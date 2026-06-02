import {
  EVALUATION_STAGES,
} from "../../evaluation.constants.js";
import {
  buildDisplayMeta,
  buildGetPayload,
} from "./manualCriteriaWeights.getPayload.js";
import {
  normalizeManualPayloadOrThrow,
  resolveAllowEmptyFromModeOrThrow,
  validateSubmittedManualWeightsOrThrow,
} from "./manualCriteriaWeights.payload.js";

export const manualCriteriaWeightsStructure = Object.freeze({
  key: "manualCriteriaWeights",
  label: "Manual weights",
  stage: EVALUATION_STAGES.CRITERIA_WEIGHTING,
  async get({ storedEvaluation, structureContext, includeMeta = false }) {
    const { payload, criterionNames } = await buildGetPayload({
      storedEvaluation,
      structureContext,
    });

    if (!includeMeta) {
      return payload;
    }

    return {
      ...payload,
      meta: {
        display: buildDisplayMeta({
          storedEvaluation,
          criterionNames,
        }),
      },
    };
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
