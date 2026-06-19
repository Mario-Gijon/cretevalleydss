import { validateAndNormalizeIntervalParameter } from "../../handlers/interval.parameter.js";

export const intervalGlobalParameterStructure = Object.freeze({
  key: "intervalGlobal",
  validateAndNormalize: validateAndNormalizeIntervalParameter,
});
