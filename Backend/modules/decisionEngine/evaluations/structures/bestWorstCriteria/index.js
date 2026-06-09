import {
  EVALUATION_STAGES,
} from "../../evaluation.constants.js";
import { buildGetPayload } from "./bestWorstCriteria.getPayload.js";
import {
  normalizePayloadOrThrow,
  validateSaveModeOrThrow,
  validateSubmittedBwmPayloadOrThrow,
} from "./bestWorstCriteria.payload.js";

export const bestWorstCriteriaStructure = Object.freeze({
  key: "bestWorstCriteria",
  label: "Best-worst weights",
  stage: EVALUATION_STAGES.CRITERIA_WEIGHTING,
  async get({ storedEvaluation, structureContext }) {
    const { payload } = await buildGetPayload({
      storedEvaluation,
      structureContext,
    });
    return payload;
  },

  async getReadSummary({ storedEvaluation, structureContext }) {
    const { payload } = await buildGetPayload({
      storedEvaluation,
      structureContext,
    });

    return {
      manualWeights: null,
      bwm: {
        bestCriterion: payload.bestCriterion,
        worstCriterion: payload.worstCriterion,
        bestToOthers: payload.bestToOthers,
        othersToWorst: payload.othersToWorst,
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
