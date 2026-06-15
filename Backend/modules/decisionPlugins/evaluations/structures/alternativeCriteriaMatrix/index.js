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
  async get({ payload: storedPayload, evaluationContext }) {
    const { payload } = await buildGetPayload({
      payload: storedPayload,
      evaluationContext,
    });
    return payload;
  },

  async save({ mode, payload, evaluationContext }) {
    const requireValue = resolveRequireValueFromModeOrThrow(mode);

    return normalizePayloadOrThrow({
      payload,
      evaluationContext,
      requireValue,
    });
  },
});
