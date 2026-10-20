import { validateAndNormalizeNumberCriterion } from "./validateAndNormalize.js";
import { validateNumberCriterionDefinition } from "./validateDefinition.js";
import { remapCriterionKeyedParameterValueOrThrow } from "../../criterionParameterRemapping.js";

export const numberCriterionParameterStructure = Object.freeze({
  key: "numberCriterion",
  validateDefinition: validateNumberCriterionDefinition,
  validateAndNormalize: validateAndNormalizeNumberCriterion,
  remapCriterionIds: remapCriterionKeyedParameterValueOrThrow,
});
