import {
  EVALUATION_STAGES,
} from "../../evaluation.constants.js";
import {
  buildDisplayMeta,
  buildGetPayload,
} from "./manualCriteriaWeightsGetPayload.js";
import {
  normalizeManualPayloadOrThrow,
  resolveAllowEmptyFromModeOrThrow,
  validateSubmittedManualWeightsOrThrow,
} from "./manualCriteriaWeightsPayload.js";

export const manualCriteriaWeightsStructure = Object.freeze({
  key: "manualCriteriaWeights",
  label: "Manual weights",
  stage: EVALUATION_STAGES.CRITERIA_WEIGHTING,
  async get({ storedEvaluation, issue, criteria, includeMeta = false }) {
    const { payload, criterionNames } = await buildGetPayload({
      storedEvaluation,
      issue,
      criteria,
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

  async save({ payload, issue, mode }) {
    const allowEmpty = resolveAllowEmptyFromModeOrThrow(mode);

    const normalized = await normalizeManualPayloadOrThrow({
      payload,
      issue,
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
