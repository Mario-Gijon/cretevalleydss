import { validateAndNormalizeArrayParameter } from "../../handlers/array.parameter.js";

export const arrayGlobalParameterStructure = Object.freeze({
  key: "arrayGlobal",
  validateAndNormalize: validateAndNormalizeArrayParameter,
});
