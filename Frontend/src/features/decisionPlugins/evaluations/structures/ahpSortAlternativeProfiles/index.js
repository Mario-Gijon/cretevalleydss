import { EVALUATION_STAGES } from "../../evaluationStages.js";
import AHPSortAlternativeProfilesView from "./AHPSortAlternativeProfilesView.jsx";
import {
  buildEmptyAHPSortAlternativeProfilesEvaluation,
  validateAHPSortAlternativeProfilesForSubmit,
} from "./operations/evaluationPayload.js";
import { resolveAHPSortAlternativeProfilesContext } from "./operations/resolveContext.js";

export const ahpSortAlternativeProfilesStructure = Object.freeze({
  key: "ahpSortAlternativeProfiles",
  stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
  displayLabel: "AHPSort I alternative-profile comparisons",
  View: AHPSortAlternativeProfilesView,
  buildInitialEvaluation: ({ decisionContext }) => {
    resolveAHPSortAlternativeProfilesContext({ decisionContext });
    return buildEmptyAHPSortAlternativeProfilesEvaluation();
  },
  validateForSubmit: validateAHPSortAlternativeProfilesForSubmit,
});
