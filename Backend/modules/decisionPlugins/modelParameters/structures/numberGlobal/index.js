import { validateAndNormalizeNumberParameter } from "../../handlers/numberParameter.js";

export const numberGlobalParameterStructure = Object.freeze({
  key: "numberGlobal",
  validateAndNormalize: validateAndNormalizeNumberParameter,
});
