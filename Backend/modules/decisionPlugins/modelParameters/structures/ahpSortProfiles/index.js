import { validateAndNormalizeAHPSortProfilesParameter } from "./validateAndNormalize.js";
import {
  validateAHPSortProfilesWithParameters,
} from "./validateWithParameters.js";
import { validateAHPSortProfilesDefinition } from "./validateDefinition.js";

export const ahpSortProfilesParameterStructure = Object.freeze({
  key: "ahpSortProfiles",
  parameterDependencies: [
    { key: "categories", parameterStructureKey: "orderedCategories" },
  ],
  validateDefinition: validateAHPSortProfilesDefinition,
  validateAndNormalize: validateAndNormalizeAHPSortProfilesParameter,
  validateWithParameters: validateAHPSortProfilesWithParameters,
});
