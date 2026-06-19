import { validateAndNormalizeIntervalParameter } from "../../handlers/intervalParameter.js";

export const intervalGlobalParameterStructure = Object.freeze({
  key: "intervalGlobal",
  validateAndNormalize: validateAndNormalizeIntervalParameter,
});
