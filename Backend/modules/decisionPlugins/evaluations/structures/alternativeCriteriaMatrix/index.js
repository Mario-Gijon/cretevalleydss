import {
  EVALUATION_STAGES,
} from "../../evaluation.constants.js";
import { buildGetPayload } from "./alternativeCriteriaMatrix.getPayload.js";
import {
  normalizePayloadOrThrow,
  resolveRequireValueFromModeOrThrow,
} from "./alternativeCriteriaMatrix.payload.js";

export const alternativeCriteriaMatrixStructure = Object.freeze({
  key: "alternativeCriteriaMatrix",
  stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
  async get({ storedEvaluation, structureContext }) {
    const { payload } = await buildGetPayload({
      storedEvaluation,
      structureContext,
    });
    return payload;
  },

  async save({ mode, payload, structureContext }) {
    const requireValue = resolveRequireValueFromModeOrThrow(mode);

    return normalizePayloadOrThrow({
      payload,
      structureContext,
      requireValue,
    });
  },
});
