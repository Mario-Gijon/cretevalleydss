import { validateAndNormalizeIntegerParameter } from "../../handlers/integerParameter.js";

export const integerGlobalParameterStructure = Object.freeze({
  key: "integerGlobal",
  validateAndNormalize: validateAndNormalizeIntegerParameter,
});
