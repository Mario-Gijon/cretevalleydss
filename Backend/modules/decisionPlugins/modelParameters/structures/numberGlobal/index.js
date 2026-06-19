import { validateAndNormalizeNumberParameter } from "../../handlers/number.parameter.js";

export const numberGlobalParameterStructure = Object.freeze({
  key: "numberGlobal",
  validateAndNormalize: validateAndNormalizeNumberParameter,
});
