import { buildEmptyPayload } from "./operations/buildEmptyPayload.js";
import { normalizePayload } from "./operations/normalizePayload.js";

export const getAHPSortAlternativeProfilesPayload = async ({
  payload,
  decisionContext,
}) =>
  normalizePayload({
    payload: payload === null || payload === undefined ? buildEmptyPayload() : payload,
    decisionContext,
    requireValue: false,
  });
