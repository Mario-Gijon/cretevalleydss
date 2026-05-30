import { isPlainObject } from "../../../../utils/common/objects.js";
import {
  normalizeConsensusPhaseOrThrow,
  validateAcceptedEvaluationCoverageOrThrow,
} from "./finishedPayloadValidation.js";
import {
  EVALUATION_STAGES,
} from "../../../decisionEngine/evaluations/evaluation.constants.js";
import { buildRankedAlternativesPayloadOrThrow } from "./buildFinishedRankings.js";
import { resolveCriteriaWeightingPhase } from "./buildFinishedCriteriaWeights.js";
import { enrichPlotsGraphicWithExpertLabels } from "./buildFinishedGraphs.js";
import { buildModelExecutionPayload } from "./buildFinishedConsensus.js";
import {
  buildFinishedPayloadContextOrThrow,
  buildFinishedSummaryFromContext,
  validateFinishedAlternativesAndLeafCriteriaOrThrow,
} from "./buildFinishedPayloadContext.js";
import {
  buildFinishedExpertRatingsByPhase,
  buildFinishedExpertRatingsContext,
} from "./buildFinishedExpertRatings.js";
import { buildFinishedCollectiveEvaluations } from "./buildFinishedCollectiveEvaluations.js";
import {
  loadFinishedSinglePhaseData,
  loadLatestAlternativeStageResultOrThrow,
} from "./loadFinishedPayloadData.js";

export const buildNonConsensusFinishedPayload = async ({ issue, structure }) => {
  const latestAlternativeResult = await loadLatestAlternativeStageResultOrThrow({
    issue,
  });

  const phase = normalizeConsensusPhaseOrThrow({
    value: latestAlternativeResult?.consensusPhase,
    issueId: issue?._id,
    stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
  });

  const criteriaWeightingPhase = await resolveCriteriaWeightingPhase({
    issueId: issue._id,
  });

  const loaded = await loadFinishedSinglePhaseData({
    issue,
    phase,
    criteriaWeightingPhase,
  });

  validateFinishedAlternativesAndLeafCriteriaOrThrow({
    issue,
    alternatives: loaded.alternatives,
    orderedLeafCriteria: loaded.orderedLeafCriteria,
  });

  const acceptedParticipations = loaded.participations.filter(
    (participation) => participation.invitationStatus === "accepted"
  );

  validateAcceptedEvaluationCoverageOrThrow({
    acceptedParticipations,
    completedEvaluations: loaded.completedAlternativeEvaluations,
    issue,
    phase,
  });

  const context = await buildFinishedPayloadContextOrThrow({
    issue,
    alternatives: loaded.alternatives,
    orderedLeafCriteria: loaded.orderedLeafCriteria,
    criteria: loaded.criteria,
    participations: loaded.participations,
    criteriaWeightingEvaluations: loaded.criteriaWeightingEvaluations,
    allModels: loaded.allModels,
    issueDomainSnapshots: loaded.issueDomainSnapshots,
    completedEvaluationsForExpertsSummary: loaded.completedAlternativeEvaluations,
  });

  const rankedAlternatives = buildRankedAlternativesPayloadOrThrow({
    stageResult: latestAlternativeResult,
  });

  const expertRatingsContext = buildFinishedExpertRatingsContext({
    issue,
    structure,
    participations: context.participations,
    criteriaWeightingEvaluationsByExpertId:
      context.criteriaWeightingEvaluationsByExpertId,
    criterionNames: context.criterionNames,
  });

  const expertsRatingsByPhase = await buildFinishedExpertRatingsByPhase({
    issue,
    structure: expertRatingsContext.structure,
    options: expertRatingsContext.options,
    evaluations: loaded.completedAlternativeEvaluations,
    stageResult: latestAlternativeResult,
    collectiveEvaluations: buildFinishedCollectiveEvaluations({
      stageResult: latestAlternativeResult,
    }),
    criteriaWeightsEvaluationByExpert:
      expertRatingsContext.criteriaWeightsEvaluationByExpert,
    isConsensus: false,
  });

  const modelExecution = buildModelExecutionPayload(latestAlternativeResult);
  const enrichedLatestPlotsGraphic = enrichPlotsGraphicWithExpertLabels({
    plotsGraphic: latestAlternativeResult?.plotsGraphic || {},
    evaluations: loaded.completedAlternativeEvaluations,
  });

  const consensusDetails = {
    modelExecution,
    rawOutput: latestAlternativeResult?.rawOutput || {},
    rankedAlternatives,
    plotsGraphic: enrichedLatestPlotsGraphic,
    consensusMeasure: latestAlternativeResult?.consensusMeasure ?? null,
  };

  return {
    summary: buildFinishedSummaryFromContext({
      issue,
      context,
      consensusInfo: null,
    }),
    alternativesRankings: [
      {
        phase,
        rankedAlternatives,
      },
    ],
    expertsRatings: {
      [phase]: expertsRatingsByPhase,
    },
    finalCriteriaWeights: context.finalCriteriaWeights,
    analyticalGraphs:
      isPlainObject(enrichedLatestPlotsGraphic) &&
      Object.keys(enrichedLatestPlotsGraphic).length > 0
        ? {
            plotsGraphic: enrichedLatestPlotsGraphic,
          }
        : null,
    consensusDetails,
    modelExecution,
    consensus: [],
    consensusHistory: [],
    consensusRounds: [],
    scenarios: [],
    modelParams: context.modelParams,
  };
};
