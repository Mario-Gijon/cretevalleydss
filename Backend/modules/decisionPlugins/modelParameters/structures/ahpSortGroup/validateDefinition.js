import { isPlainObject } from "../../../../../utils/common/objects.js";

export const validateAHPSortGroupDefinition = (parameter) => {
  if (!isPlainObject(parameter)) return "parameter must be an object";
  if (Object.hasOwn(parameter, "default")) {
    return "must not define a default group tie policy";
  }
  if (parameter.required === true) {
    return "must be optional for single-expert AHPSort I compatibility";
  }

  return null;
};
