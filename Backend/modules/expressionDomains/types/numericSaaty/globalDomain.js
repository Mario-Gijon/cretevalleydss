import {
  AHP_SAATY_SCALE_KEY,
  AHP_SAATY_SCALE_NAME,
} from "./saatyScale.js";

export const buildCanonicalSaatyExpressionDomain = () => ({
  owner: null,
  name: AHP_SAATY_SCALE_NAME,
  typeKey: "numericSaaty",
  definition: { scale: AHP_SAATY_SCALE_KEY },
});
