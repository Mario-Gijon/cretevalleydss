import { validateArrayGlobalParameter } from "./validate.js";

export const arrayGlobalParameterStructure = Object.freeze({
  key: "arrayGlobal",
  validateAndNormalize: validateArrayGlobalParameter,
});
