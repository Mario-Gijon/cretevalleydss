import { validateAndNormalizeIntegerParameter } from "../../handlers/integer.parameter.js";

export const integerGlobalParameterStructure = Object.freeze({
  key: "integerGlobal",
  validateAndNormalize: validateAndNormalizeIntegerParameter,
});
