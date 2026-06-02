import {
  EVALUATION_STAGES,
} from "../../evaluation.constants.js";
import {
  buildDisplayMeta,
  buildGetPayload,
} from "./bestWorstCriteria.getPayload.js";
import {
  normalizePayloadOrThrow,
  validateSaveModeOrThrow,
  validateSubmittedBwmPayloadOrThrow,
} from "./bestWorstCriteria.payload.js";

export const bestWorstCriteriaStructure = Object.freeze({
  key: "bestWorstCriteria",
  label: "Best-worst weights",
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
    validateSaveModeOrThrow(mode);

    const normalized = await normalizePayloadOrThrow({
      payload,
      structureContext,
    });

    if (mode === "submit") {
      validateSubmittedBwmPayloadOrThrow({
        criterionNames: normalized.criterionNames,
        payload: normalized.payload,
      });
    }

    return normalized.payload;
  },
});
