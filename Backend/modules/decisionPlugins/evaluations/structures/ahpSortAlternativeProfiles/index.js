import { EVALUATION_STAGES } from "../../evaluationStages.js";
import { getAHPSortAlternativeProfilesPayload } from "./ahpSortAlternativeProfiles.get.js";
import { saveAHPSortAlternativeProfilesPayload } from "./ahpSortAlternativeProfiles.save.js";
import { remapAHPSortAlternativeProfilesCriterionIds } from "./operations/remapCriterionIds.js";

export const ahpSortAlternativeProfilesStructure = Object.freeze({
  key: "ahpSortAlternativeProfiles",
  stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
  get: getAHPSortAlternativeProfilesPayload,
  save: saveAHPSortAlternativeProfilesPayload,
  remapCriterionIds: remapAHPSortAlternativeProfilesCriterionIds,
});
