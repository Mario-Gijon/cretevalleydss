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
  stage: EVALUATION_STAGES.CRITERIA_WEIGHTING,
  async get({ payload: storedPayload, decisionContext }) {
    const { payload } = await buildGetPayload({
      payload: storedPayload,
      decisionContext,
    });
    return payload;
  },

  async save({ mode, payload, decisionContext }) {
    validateSaveModeOrThrow(mode);

    const normalized = await normalizePayloadOrThrow({
      payload,
      decisionContext,
    });

    if (mode === "submit") {
      validateSubmittedBwmPayloadOrThrow({
        criterionItems: normalized.criterionItems,
        payload: normalized.payload,
      });
    }

    return normalized.payload;
  },
});
