import { normalizeAHPSortGroupConfiguration } from "../../../shared/ahpSortGroup.js";
import { toInvalid, toValid } from "../../parameterValidationResult.js";
import { validateAHPSortGroupDefinition } from "./validateDefinition.js";

export const ahpSortGroupParameterStructure = Object.freeze({
  key: "ahpSortGroup",
  implementationStatus: "ready",
  validateDefinition: validateAHPSortGroupDefinition,
  validateAndNormalize: ({ value }) => {
    const normalized = normalizeAHPSortGroupConfiguration(value);
    return normalized.error
      ? toInvalid(normalized.error, value)
      : toValid(normalized.value);
  },
});
