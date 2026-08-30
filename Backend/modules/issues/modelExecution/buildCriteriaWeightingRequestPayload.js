import { getOrderedCriteriaForWeightingOrThrow } from "../evaluations/criteriaWeightingStructureData.js";
import { createInternalError } from "../../../utils/common/errors.js";
import { toIdString } from "../../../utils/common/ids.js";
import { EVALUATION_STAGES } from "../../decisionPlugins/evaluations/evaluationStages.js";
import { normalizeEvaluationsPayload } from "./normalizeEvaluationsPayload.js";

export const buildCriteriaWeightingRequestPayload = async ({
  issue,
  structureKey,
  evaluations,
  phase,
  expertWeightsByExpertId = null,
}) => {
  const { weightingCriteria } = await getOrderedCriteriaForWeightingOrThrow({
    issue,
  });

  const criteria = weightingCriteria.map((criterion, index) => {
    const id = toIdString(criterion?._id);

    if (!id) {
      throw createInternalError(
        "A persisted criteria-weighting criterion is missing its id.",
        {
          field: `criteria[${index}].id`,
          details: {
            issueId: toIdString(issue?._id),
            criterionName: criterion?.name ?? null,
          },
        }
      );
    }

    return {
      id,
      name: criterion.name,
      type: criterion.type,
    };
  });

  return {
    modelParameters: issue.criteriaWeightingParameters,
    evaluations: normalizeEvaluationsPayload(evaluations, expertWeightsByExpertId),
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
      criteria,
      consensusPhase: phase,
      previousStageResult: null,
      structure: {
        key: structureKey,
        stage: EVALUATION_STAGES.CRITERIA_WEIGHTING,
      },
    },
  };
};
