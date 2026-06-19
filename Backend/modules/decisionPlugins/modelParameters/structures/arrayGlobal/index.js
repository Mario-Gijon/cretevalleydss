import { validateAndNormalizeArrayParameter } from "../../handlers/arrayParameter.js";

export const arrayGlobalParameterStructure = Object.freeze({
  key: "arrayGlobal",
  validateAndNormalize: validateAndNormalizeArrayParameter,
});
