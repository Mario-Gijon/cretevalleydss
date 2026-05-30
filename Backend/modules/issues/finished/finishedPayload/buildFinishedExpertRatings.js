import {
  buildFinishedExpertEvaluationsByEmail,
  getFinishedAlternativeEvaluationStructureOrThrow,
} from "./buildFinishedEvaluationDisplayPayloads.js";
import { buildCriteriaWeightsEvaluationByExpert } from "./buildFinishedCriteriaWeights.js";

export const buildFinishedExpertRatingsContext = ({
  issue,
  participations,
  criteriaWeightingEvaluationsByExpertId,
  criterionNames,
}) => {
  return {
    structure: getFinishedAlternativeEvaluationStructureOrThrow({ issue }),
    criteriaWeightsEvaluationByExpert: buildCriteriaWeightsEvaluationByExpert({
      issue,
      participations,
      criteriaWeightingEvaluationsByExpertId,
      criterionNames,
    }),
  };
};

export const buildFinishedExpertRatingsByPhase = async ({
  issue,
  structure,
  evaluations,
  stageResult,
  collectiveEvaluations,
  criteriaWeightsEvaluationByExpert,
  includeConsensusMeasure,
  includeCollectiveEvaluationsLocalizedByExpert,
}) => {
  const expertEvaluations = await buildFinishedExpertEvaluationsByEmail({
    structure,
    evaluations,
    issue,
  });

  const ratings = {};

  if (includeConsensusMeasure) {
    ratings.consensusMeasure = stageResult?.consensusMeasure ?? null;
  }

  ratings.collectiveEvaluations = collectiveEvaluations;

  if (includeCollectiveEvaluationsLocalizedByExpert) {
    ratings.collectiveEvaluationsLocalizedByExpert = null;
  }

  ratings.expertEvaluations = expertEvaluations;
  ratings.criteriaWeightsEvaluationByExpert = criteriaWeightsEvaluationByExpert;

  return ratings;
};
