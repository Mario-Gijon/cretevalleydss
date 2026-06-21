import { validateIntervalGlobalParameter } from "./validate.js";

export const intervalGlobalParameterStructure = Object.freeze({
  key: "intervalGlobal",
  validateAndNormalize: validateIntervalGlobalParameter,
});
