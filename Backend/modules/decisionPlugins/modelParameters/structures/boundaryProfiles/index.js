import { remapBoundaryProfileCriterionIds } from "./remapCriterionIds.js";
import {
  validateAndNormalizeBoundaryProfiles,
  validateBoundaryProfilesWithParameters,
} from "./validateAndNormalize.js";
import { validateBoundaryProfilesDefinition } from "./validateDefinition.js";

export const boundaryProfilesParameterStructure = Object.freeze({
  key: "boundaryProfiles",
  validationContextKeys: ["criterionDomainsById"],
  parameterDependencies: [
    { key: "categories", parameterStructureKey: "orderedCategories" },
  ],
  validateDefinition: validateBoundaryProfilesDefinition,
  validateAndNormalize: validateAndNormalizeBoundaryProfiles,
  validateWithParameters: validateBoundaryProfilesWithParameters,
  remapCriterionIds: remapBoundaryProfileCriterionIds,
});
