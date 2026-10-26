import { resolveRequireValue } from "../../shared/resolveRequireValue.js";
import { normalizePayload } from "./operations/normalizePayload.js";

export const saveCriteriaPairwiseAHPPayload = async ({
  payload,
  decisionContext,
  mode,
}) =>
  normalizePayload({
    payload,
    decisionContext,
    requireValue: resolveRequireValue(mode),
  });
