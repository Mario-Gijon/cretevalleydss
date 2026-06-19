import { validateAndNormalizeEnumParameter } from "../../handlers/enumParameter.js";

export const selectGlobalParameterStructure = Object.freeze({
  key: "selectGlobal",
  validateAndNormalize: validateAndNormalizeEnumParameter,
});
