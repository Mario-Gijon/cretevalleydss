import {
  buildFinishedExpertEvaluationsByEmail,
  getFinishedAlternativeEvaluationStructureOrThrow,
} from "./buildFinishedEvaluationDisplayPayloads.js";
import { buildCriteriaWeightsEvaluationByExpert } from "./buildFinishedCriteriaWeights.js";

export const buildFinishedExpertRatingsContext = async ({
  issue,
  structure,
  participations,
  criteriaWeightingEvaluationsByExpertId,
  criterionNames,
}) => {
  const resolvedStructure =
    structure || getFinishedAlternativeEvaluationStructureOrThrow({ issue });

  return {
    structure: resolvedStructure,
    criteriaWeightsEvaluationByExpert: await buildCriteriaWeightsEvaluationByExpert({
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
}) => {
  const expertEvaluations = await buildFinishedExpertEvaluationsByEmail({
    structure,
    evaluations,
    issue,
  });

  const ratings = {};

  ratings.consensusMeasure = stageResult?.consensusMeasure ?? null;
  ratings.collectiveEvaluations = collectiveEvaluations;
  ratings.collectiveEvaluationsLocalizedByExpert = null;
  ratings.expertEvaluations = expertEvaluations;
  ratings.criteriaWeightsEvaluationByExpert = criteriaWeightsEvaluationByExpert;

  return ratings;
};
