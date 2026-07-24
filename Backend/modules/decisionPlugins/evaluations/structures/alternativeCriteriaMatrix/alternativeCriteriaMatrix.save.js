import {
  normalizeAlternativeCriteriaMatrix,
  resolveRequireValueFromModeOrThrow,
} from "./operations/normalizeAlternativeCriteriaMatrix.js";

export const saveAlternativeCriteriaMatrixPayload = async ({
  payload,
  decisionContext,
  mode,
}) => {
  const requireValue = resolveRequireValueFromModeOrThrow(mode);

  return normalizeAlternativeCriteriaMatrix({
    payload,
    decisionContext,
    requireValue,
  });
};
