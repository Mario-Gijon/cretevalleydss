import { getOrderedAlternativeAndCriterionNames } from "../evaluations/evaluationStructureData.js";
import { toIdString } from "../../../utils/common/ids.js";
import { EVALUATION_STAGES } from "../../decisionPlugins/evaluations/evaluationStages.js";
import { normalizeEvaluationsPayload } from "./normalizeEvaluationsPayload.js";
import { AHPSORT_I_API_MODEL_KEY } from "./validateAHPSortIExecutionEvaluations.js";

export const buildIssueModelRequestPayload = async ({
  issue,
  structureKey,
  evaluations,
  phase,
  expertWeightsByExpertId = null,
}) => {
  const { alternatives, criteria } =
    await getOrderedAlternativeAndCriterionNames({ issue });

  const apiModelKey = issue.apiModelKey || issue.model?.apiModelKey;
  const isAHPSortI = apiModelKey === AHPSORT_I_API_MODEL_KEY;
  let modelParameters = issue.modelParameters;
  if (
    isAHPSortI && evaluations.length === 1 &&
    Object.hasOwn(modelParameters || {}, "ahpSortGroup")
  ) {
    modelParameters = { ...modelParameters };
    delete modelParameters.ahpSortGroup;
  }

  return {
    modelParameters,
    evaluations: normalizeEvaluationsPayload(
      evaluations,
      isAHPSortI ? null : expertWeightsByExpertId,
      { includeExpertWeights: !isAHPSortI }
    ),
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
        description: alternative.description || null,
      })),
      criteria: criteria.map((criterion) => ({
        id: toIdString(criterion._id),
        name: criterion.name,
        description: criterion.description || null,
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
