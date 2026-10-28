import { normalizeAHPSortProfilesConfiguration } from "../../../shared/ahpSortProfiles.js";
import { toInvalid, toValid } from "../../parameterValidationResult.js";

export const validateAHPSortProfilesWithParameters = ({
  value,
  dependencies,
}) => {
  const normalized = normalizeAHPSortProfilesConfiguration({
    value,
    categories: dependencies?.categories,
  });
  return normalized.error
    ? toInvalid(normalized.error, value)
    : toValid(normalized.value);
};
