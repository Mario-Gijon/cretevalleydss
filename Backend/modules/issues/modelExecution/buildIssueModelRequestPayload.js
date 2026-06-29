import { getOrderedAlternativeAndCriterionNames } from "../evaluations/evaluationStructureData.js";
import { toIdString } from "../../../utils/common/ids.js";
import { EVALUATION_STAGES } from "../../decisionPlugins/evaluations/evaluationStages.js";
import { normalizeEvaluationsPayload } from "./normalizeEvaluationsPayload.js";

export const buildIssueModelRequestPayload = async ({
  issue,
  structureKey,
  evaluations,
  phase,
}) => {
  const { alternatives, criteria } =
    await getOrderedAlternativeAndCriterionNames({ issue });

  return {
    modelParameters: issue.modelParameters,
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
      alternatives: alternatives.map((alternative) => ({
        id: toIdString(alternative._id),
        name: alternative.name,
      })),
      criteria: criteria.map((criterion) => ({
        id: toIdString(criterion._id),
        name: criterion.name,
        type: criterion.type,
        expressionDomain: criterion.expressionDomain,
      })),
      consensusPhase: phase,
      previousStageResult: null,
      structure: {
        key: structureKey,
        stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
      },
    },
  };
};
