import {
  EVALUATION_STAGES,
} from "../../evaluationStages.js";
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
  async get({ payload: storedPayload, evaluationContext }) {
    const { payload } = await buildGetPayload({
      payload: storedPayload,
      evaluationContext,
    });
    return payload;
  },

  async save({ mode, payload, evaluationContext }) {
    validateSaveModeOrThrow(mode);

    const normalized = await normalizePayloadOrThrow({
      payload,
      evaluationContext,
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
