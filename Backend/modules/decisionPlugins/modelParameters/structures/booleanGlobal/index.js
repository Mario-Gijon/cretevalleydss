import { validateAndNormalizeBooleanParameter } from "../../handlers/booleanParameter.js";

export const booleanGlobalParameterStructure = Object.freeze({
  key: "booleanGlobal",
  validateAndNormalize: validateAndNormalizeBooleanParameter,
});
