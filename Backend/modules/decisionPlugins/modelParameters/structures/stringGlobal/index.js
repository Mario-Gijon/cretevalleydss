import { validateAndNormalizeStringParameter } from "../../handlers/string.parameter.js";

export const stringGlobalParameterStructure = Object.freeze({
  key: "stringGlobal",
  validateAndNormalize: validateAndNormalizeStringParameter,
});
