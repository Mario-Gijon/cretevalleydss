import { validateAndNormalizeBooleanParameter } from "../../handlers/boolean.parameter.js";

export const booleanGlobalParameterStructure = Object.freeze({
  key: "booleanGlobal",
  validateAndNormalize: validateAndNormalizeBooleanParameter,
});
