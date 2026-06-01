import { isPlainObject } from "../../../../utils/common/objects.js";
import {
  buildFinishedExpertEvaluationsByEmail,
  getFinishedAlternativeEvaluationStructureOrThrow,
} from "./buildFinishedEvaluationDisplayPayloads.js";
import { buildCriteriaWeightsEvaluationByExpert } from "./buildFinishedCriteriaWeights.js";

const resolveFinishedPayloadOptions = ({ structure }) => {
  const options = isPlainObject(structure?.finishedPayloadOptions)
    ? structure.finishedPayloadOptions
    : {};

  return {
    includeNonConsensusConsensusMeasureInExpertRatings:
      options.includeNonConsensusConsensusMeasureInExpertRatings === true,
    includeCollectiveEvaluationsLocalizedByExpert:
      options.includeCollectiveEvaluationsLocalizedByExpert === true,
  };
};

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
    options: resolveFinishedPayloadOptions({ structure: resolvedStructure }),
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
  options,
  evaluations,
  stageResult,
  collectiveEvaluations,
  criteriaWeightsEvaluationByExpert,
  isConsensus,
}) => {
  const expertEvaluations = await buildFinishedExpertEvaluationsByEmail({
    structure,
    evaluations,
    issue,
  });

  const ratings = {};

  if (
    isConsensus === true ||
    options?.includeNonConsensusConsensusMeasureInExpertRatings === true
  ) {
    ratings.consensusMeasure = stageResult?.consensusMeasure ?? null;
  }

  ratings.collectiveEvaluations = collectiveEvaluations;

  if (options?.includeCollectiveEvaluationsLocalizedByExpert === true) {
    ratings.collectiveEvaluationsLocalizedByExpert = null;
  }

  ratings.expertEvaluations = expertEvaluations;
  ratings.criteriaWeightsEvaluationByExpert = criteriaWeightsEvaluationByExpert;

  return ratings;
};
