import {
  EVALUATION_STAGES,
} from "../../evaluation.constants.js";
import {
  buildDisplayMeta,
  buildGetPayload,
} from "./bestWorstCriteriaGetPayload.js";
import {
  normalizePayloadOrThrow,
  validateSaveModeOrThrow,
  validateSubmittedBwmPayloadOrThrow,
} from "./bestWorstCriteriaPayload.js";

export const bestWorstCriteriaStructure = Object.freeze({
  key: "bestWorstCriteria",
  label: "Best-worst weights",
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
    validateSaveModeOrThrow(mode);

    const normalized = await normalizePayloadOrThrow({ payload, issue });

    if (mode === "submit") {
      validateSubmittedBwmPayloadOrThrow({
        criterionNames: normalized.criterionNames,
        payload: normalized.payload,
      });
    }

    return normalized.payload;
  },
});
