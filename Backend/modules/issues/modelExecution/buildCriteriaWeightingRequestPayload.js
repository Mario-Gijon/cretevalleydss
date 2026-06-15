import { getOrderedAlternativeAndCriterionNames } from "../evaluations/evaluationStructureData.js";
import { toIdString } from "../../../utils/common/ids.js";
import { EVALUATION_STAGES } from "../../decisionPlugins/evaluations/evaluationStages.js";
import { normalizeEvaluationsPayload } from "./normalizeEvaluationsPayload.js";

export const buildCriteriaWeightingRequestPayload = async ({
  issue,
  structureKey,
  evaluations,
  phase,
}) => {
  const { criteria } = await getOrderedAlternativeAndCriterionNames({ issue });

  return {
    modelParameters: issue.criteriaWeightingParameters,
    evaluations: normalizeEvaluationsPayload(evaluations),
    context: {
      issue: {
        id: toIdString(issue._id),
        name: issue.name,
        consensusThreshold:
          typeof issue.consensusThreshold === "number" &&
          Number.isFinite(issue.consensusThreshold)
            ? issue.consensusThreshold
            : null,
        consensusMaxPhases:
          Number.isInteger(issue.consensusMaxPhases) && issue.consensusMaxPhases > 0
            ? issue.consensusMaxPhases
            : null,
      },
      criteria: criteria.map((criterion) => ({
        id: toIdString(criterion._id),
        name: criterion.name,
        type: criterion.type,
      })),
      consensusPhase: phase,
      previousStageResult: null,
      structure: {
        key: structureKey,
        stage: EVALUATION_STAGES.CRITERIA_WEIGHTING,
      },
    },
  };
};
