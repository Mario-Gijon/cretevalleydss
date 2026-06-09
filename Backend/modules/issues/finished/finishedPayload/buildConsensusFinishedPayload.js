import { createInternalError } from "../../../../utils/common/errors.js";
import { toIdString } from "../../../../utils/common/ids.js";
import { isPlainObject } from "../../../../utils/common/objects.js";
import {
  EVALUATION_STAGES,
} from "../../../decisionEngine/evaluations/evaluation.constants.js";
import {
  normalizeConsensusPhaseOrThrow,
  validateAcceptedEvaluationCoverageOrThrow,
} from "./finishedPayloadValidation.js";
import {
  buildConsensusInfo,
  buildConsensusRoundPayloadOrThrow,
} from "./buildFinishedConsensus.js";
import { resolveCriteriaWeightingPhase } from "./buildFinishedCriteriaWeights.js";
import { enrichPlotsGraphicWithExpertLabels } from "./buildFinishedGraphs.js";
import {
  buildFinishedPayloadContextOrThrow,
  buildFinishedSummaryFromContext,
} from "./buildFinishedPayloadContext.js";
import {
  buildFinishedExpertRatingsByPhase,
  buildFinishedExpertRatingsContext,
} from "./buildFinishedExpertRatings.js";
import { buildFinishedCollectiveEvaluations } from "./buildFinishedCollectiveEvaluations.js";
import { buildEvaluationStructureContext } from "../../../decisionEngine/evaluations/evaluationStructureContext.js";
import {
  groupCompletedEvaluationsByPhase,
  loadConsensusAlternativeStageResultsOrThrow,
  loadFinishedConsensusData,
} from "./loadFinishedPayloadData.js";

export const buildConsensusFinishedPayload = async ({ issue, structure }) => {
  const alternativeStageResults = await loadConsensusAlternativeStageResultsOrThrow({
    issue,
  });

  const phaseList = alternativeStageResults.map((stageResult) =>
    normalizeConsensusPhaseOrThrow({
      value: stageResult.consensusPhase,
      issueId: issue._id,
      stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
    })
  );

  const criteriaWeightingPhase = await resolveCriteriaWeightingPhase({
    issueId: issue._id,
  });

  const loaded = await loadFinishedConsensusData({
    issue,
    phaseList,
    criteriaWeightingPhase,
  });

  const acceptedParticipations = loaded.participations.filter(
    (participation) => participation.invitationStatus === "accepted"
  );

  const completedByPhase = groupCompletedEvaluationsByPhase({
    evaluations: loaded.allCompletedAlternativeEvaluations,
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
    completedEvaluationsForExpertsSummary: loaded.allCompletedAlternativeEvaluations,
  });

  const expertRatingsContext = await buildFinishedExpertRatingsContext({
    issue,
    structure,
    participations: context.participations,
    criteriaWeightingEvaluationsByExpertId:
      context.criteriaWeightingEvaluationsByExpertId,
    criterionNames: context.criterionNames,
    orderedLeafCriteria: context.orderedLeafCriteria,
  });

  const consensusRounds = [];
  const alternativesRankings = [];
  const expertsRatings = {};

  for (const stageResult of alternativeStageResults) {
    const phase = Number(stageResult.consensusPhase);
    const phaseEvaluations = completedByPhase.get(phase);

    if (!phaseEvaluations || phaseEvaluations.length === 0) {
      throw createInternalError(
        "Completed alternative evaluations are missing for a consensus phase",
        {
          field: "evaluations",
          details: {
            issueId: toIdString(issue._id),
            phase,
          },
        }
      );
    }

    validateAcceptedEvaluationCoverageOrThrow({
      acceptedParticipations,
      completedEvaluations: phaseEvaluations,
      issue,
      phase,
    });

    const enrichedPlotsGraphic = enrichPlotsGraphicWithExpertLabels({
      plotsGraphic: stageResult.plotsGraphic,
      evaluations: phaseEvaluations,
    });

    const round = buildConsensusRoundPayloadOrThrow({
      stageResult,
      threshold: issue.consensusThreshold,
    });
    round.plotsGraphic = enrichedPlotsGraphic;
    const collectiveEvaluations = buildFinishedCollectiveEvaluations({
      stageResult,
    });
    const structureContext = await buildEvaluationStructureContext({
      issue,
      alternatives: context.alternatives,
      leafCriteria: context.orderedLeafCriteria,
      collectiveEvaluations,
    });

    expertsRatings[phase] = await buildFinishedExpertRatingsByPhase({
      structure: expertRatingsContext.structure,
      structureContext,
      evaluations: phaseEvaluations,
      stageResult,
      collectiveEvaluations,
      criteriaWeightsEvaluationByExpert:
        expertRatingsContext.criteriaWeightsEvaluationByExpert,
    });

    alternativesRankings.push({
      phase,
      rankedAlternatives: round.rankedAlternatives,
    });

    consensusRounds.push(round);
  }

  if (consensusRounds.length === 0) {
    throw createInternalError("Consensus rounds are missing for finished consensus issue", {
      field: "consensusRounds",
      details: {
        issueId: toIdString(issue._id),
      },
    });
  }

  if (alternativesRankings.length === 0) {
    throw createInternalError("Alternative rankings are missing for finished consensus issue", {
      field: "alternativesRankings",
      details: {
        issueId: toIdString(issue._id),
      },
    });
  }

  const summary = buildFinishedSummaryFromContext({
    issue,
    context,
    consensusInfo: buildConsensusInfo({
      issue,
      consensusRounds,
    }),
  });

  const latestRound = consensusRounds[consensusRounds.length - 1];
  const latestRankedAlternatives =
    alternativesRankings[alternativesRankings.length - 1].rankedAlternatives;

  if (!Number.isInteger(issue.consensusPhase) || issue.consensusPhase <= 0) {
    throw createInternalError("Issue consensusPhase must be a positive integer", {
      field: "consensusPhase",
      details: {
        issueId: toIdString(issue._id),
        consensusPhase: issue.consensusPhase,
      },
    });
  }

  const modelExecution = latestRound.modelExecution;

  const scatterPlotByPhase = Array(issue.consensusPhase).fill(null);
  for (const stageResult of alternativeStageResults) {
    const phase = Number(stageResult.consensusPhase);
    const phaseEvaluations = completedByPhase.get(phase);

    if (!phaseEvaluations || phaseEvaluations.length === 0) {
      throw createInternalError(
        "Completed alternative evaluations are missing for a consensus phase",
        {
          field: "evaluations",
          details: {
            issueId: toIdString(issue._id),
            phase,
          },
        }
      );
    }

    const plotsGraphic = enrichPlotsGraphicWithExpertLabels({
      plotsGraphic: stageResult.plotsGraphic,
      evaluations: phaseEvaluations,
    });
    if (
      Number.isInteger(phase) &&
      phase > 0 &&
      isPlainObject(plotsGraphic) &&
      Object.keys(plotsGraphic).length > 0
    ) {
      scatterPlotByPhase[phase - 1] = plotsGraphic;
    }
  }

  const hasScatterData = scatterPlotByPhase.some(
    (entry) => isPlainObject(entry) && Object.keys(entry).length > 0
  );

  const consensusLineSeries = consensusRounds.map((round) => ({
    phase: round.phase,
    consensusMeasure: round.consensusMeasure,
    threshold: issue.consensusThreshold ?? null,
  }));

  const latestPhaseEvaluations = completedByPhase.get(Number(latestRound.phase));

  if (!latestPhaseEvaluations || latestPhaseEvaluations.length === 0) {
    throw createInternalError(
      "Completed alternative evaluations are missing for the latest consensus phase",
      {
        field: "evaluations",
        details: {
          issueId: toIdString(issue._id),
          phase: latestRound.phase,
        },
      }
    );
  }

  const latestRoundPlotsGraphic = enrichPlotsGraphicWithExpertLabels({
    plotsGraphic: latestRound.plotsGraphic,
    evaluations: latestPhaseEvaluations,
  });

  return {
    summary,
    alternativesRankings,
    expertsRatings,
    finalCriteriaWeights: context.finalCriteriaWeights,
    analyticalGraphs: {
      ...(hasScatterData ? { scatterPlot: scatterPlotByPhase } : {}),
      consensusLevelLineChart: {
        labels: consensusLineSeries.map((entry) => `Round ${entry.phase}`),
        data: consensusLineSeries.map((entry) => entry.consensusMeasure),
        threshold: issue.consensusThreshold ?? null,
        series: consensusLineSeries,
      },
    },
    consensusDetails: {
      modelExecution,
      rawOutput: latestRound.rawOutput,
      rankedAlternatives: latestRankedAlternatives,
      plotsGraphic: latestRoundPlotsGraphic,
      consensusMeasure: latestRound.consensusMeasure,
    },
    modelExecution,
    consensus: consensusRounds,
    consensusHistory: consensusRounds,
    consensusRounds,
    scenarios: [],
    modelParams: context.modelParams,
  };
};
