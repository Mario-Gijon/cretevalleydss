import { normalizeRankingResult } from "./normalize.js";

export const rankingV1ResultStructure = Object.freeze({
  key: "ranking",
  version: 1,
  implementationStatus: "ready",
  validateAndNormalize: normalizeRankingResult,
});
