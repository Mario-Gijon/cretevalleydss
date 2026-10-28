import { normalizeAHPSortProfilesShape } from "../../../shared/ahpSortProfiles.js";
import { toInvalid, toValid } from "../../parameterValidationResult.js";

export const validateAndNormalizeAHPSortProfilesParameter = ({ value }) => {
  const normalized = normalizeAHPSortProfilesShape(value);
  return normalized.error
    ? toInvalid(normalized.error, value)
    : toValid(normalized.value);
};
