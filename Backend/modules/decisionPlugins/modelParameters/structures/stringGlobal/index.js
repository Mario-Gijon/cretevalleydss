import { validateAndNormalizeStringParameter } from "../../handlers/stringParameter.js";

export const stringGlobalParameterStructure = Object.freeze({
  key: "stringGlobal",
  validateAndNormalize: validateAndNormalizeStringParameter,
});
