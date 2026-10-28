import { isPlainObject } from "../../../../../utils/common/objects.js";
import { normalizeAHPSortProfilesShape } from "../../../shared/ahpSortProfiles.js";

export const validateAHPSortProfilesDefinition = (parameter) => {
  if (!isPlainObject(parameter)) return "parameter must be an object";
  if (!Object.hasOwn(parameter, "default")) return null;

  const result = normalizeAHPSortProfilesShape(parameter.default);
  return result.error ? `default ${result.error}` : null;
};
