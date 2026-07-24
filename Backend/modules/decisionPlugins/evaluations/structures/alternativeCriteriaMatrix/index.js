import {
  EVALUATION_STAGES,
} from "../../evaluationStages.js";
import { buildGetPayload } from "./alternativeCriteriaMatrix.getPayload.js";
import {
  normalizePayloadOrThrow,
  resolveRequireValueFromModeOrThrow,
} from "./alternativeCriteriaMatrix.payload.js";

export const alternativeCriteriaMatrixStructure = Object.freeze({
  key: "alternativeCriteriaMatrix",
  stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
  async get({ payload: storedPayload, decisionContext }) {
    const { payload } = await buildGetPayload({
      payload: storedPayload,
      decisionContext,
    });
    return payload;
  },

  async save({ mode, payload, decisionContext }) {
    const requireValue = resolveRequireValueFromModeOrThrow(mode);

    return normalizePayloadOrThrow({
      payload,
      decisionContext,
      requireValue,
    });
  },
});
