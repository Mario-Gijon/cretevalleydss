import { IssueModel } from "../../../../models/IssueModels.js";
import { IssueEvaluation } from "../../../../models/IssueEvaluations.js";
import { IssueExpressionDomain } from "../../../../models/IssueExpressionDomains.js";
import { IssueStageResult } from "../../../../models/IssueStageResults.js";
import { Criterion } from "../../../../models/Criteria.js";
import { Participation } from "../../../../models/Participations.js";
import {
  getOrderedAlternativesDb,
  getOrderedLeafCriteriaDb,
} from "../../shared/ordering.js";
import {
  EVALUATION_STAGES,
} from "../../../decisionEngine/evaluations/evaluation.constants.js";
import { toIdString } from "../../../../utils/common/ids.js";
import { createInternalError } from "../../../../utils/common/errors.js";
import { isPlainObject } from "../../../../utils/common/objects.js";
import { normalizeConsensusPhaseOrThrow, validateAcceptedEvaluationCoverageOrThrow } from "./finishedPayload.errors.js";
import {
  buildConsensusInfo,
  buildConsensusRoundPayloadOrThrow,
} from "./buildFinishedConsensus.js";
import {
  buildFinishedExpertEvaluationsByEmail,
  getFinishedAlternativeEvaluationStructureOrThrow,
} from "./buildFinishedEvaluationDisplayPayloads.js";
import {
  buildCriteriaWeightsEvaluationByExpert,
  resolveCriteriaWeightingPhase,
  resolveFinalCriteriaWeightsOrThrow,
} from "./buildFinishedCriteriaWeights.js";
import {
  buildParticipationsSummary,
  buildSummarySection,
} from "./buildFinishedSummary.js";
import { buildAvailableModelsPayload } from "./buildFinishedScenarioModels.js";
import { enrichPlotsGraphicWithExpertLabels } from "./buildFinishedGraphs.js";
import { buildModelParamsPayloadOrThrow } from "./buildFinishedModelParams.js";

const ensureModelOrThrow = async ({ issue }) => {
  const populatedModel = issue?.model;

  if (
    populatedModel &&
    typeof populatedModel === "object" &&
    populatedModel !== null &&
    (populatedModel.name || populatedModel.parameters)
  ) {
    return populatedModel;
  }

  const modelId = issue?.model?._id || issue?.model;
  const loadedModel = await IssueModel.findById(modelId).lean();

  if (!loadedModel) {
    throw createInternalError("Finished issue model not found", {
      field: "model",
      details: {
        issueId: toIdString(issue?._id),
        modelId: toIdString(modelId),
      },
    });
  }

  return loadedModel;
};

export const buildConsensusPairwiseFinishedPayload = async ({ issue }) => {
  const alternativeStageResults = await IssueStageResult.find({
    issue: issue._id,
    stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
  })
    .sort({ consensusPhase: 1 })
    .lean();

  if (!Array.isArray(alternativeStageResults) || alternativeStageResults.length === 0) {
    throw createInternalError(
      "Finished consensus issue requires alternative evaluation stage results",
      {
        field: "stageResults",
        details: {
          issueId: toIdString(issue?._id),
          stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
        },
      }
    );
  }

  const phaseList = alternativeStageResults.map((stageResult) =>
    normalizeConsensusPhaseOrThrow({
      value: stageResult?.consensusPhase,
      issueId: issue?._id,
      stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
    })
  );
  const criteriaWeightingPhase = await resolveCriteriaWeightingPhase({
    issueId: issue._id,
  });

  const [
    alternatives,
    orderedLeafCriteria,
    criteria,
    participations,
    allCompletedAlternativeEvaluations,
    criteriaWeightingEvaluations,
    allModels,
    issueDomainSnapshots,
  ] = await Promise.all([
    getOrderedAlternativesDb({
      issueId: issue._id,
      issueDoc: issue,
      select: "_id name",
      lean: true,
    }),
    getOrderedLeafCriteriaDb({
      issueId: issue._id,
      issueDoc: issue,
      select: "_id name type expressionDomain",
      lean: true,
    }),
    Criterion.find({ issue: issue._id }).lean(),
    Participation.find({ issue: issue._id })
      .populate("expert", "email name")
      .lean(),
    IssueEvaluation.find({
      issue: issue._id,
      stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
      consensusPhase: { $in: phaseList },
      completed: true,
    })
      .populate("expert", "email name")
      .lean(),
    criteriaWeightingPhase
      ? IssueEvaluation.find({
        issue: issue._id,
        stage: EVALUATION_STAGES.CRITERIA_WEIGHTING,
        consensusPhase: criteriaWeightingPhase,
      })
        .populate("expert", "email name")
        .lean()
      : Promise.resolve([]),
    IssueModel.find({
      isIssueModel: true,
      $or: [
        { manifestSync: { $exists: false } },
        { "manifestSync.isStale": { $exists: false } },
        { "manifestSync.isStale": false },
      ],
    })
      .select(
        "_id name alternativeEvaluationStructureKey supportsConsensus isMultiCriteria usesCriteriaWeights usesFuzzyCriteriaWeights usesCriterionTypes smallDescription moreInfoUrl parameters supportedDomains"
      )
      .lean(),
    IssueExpressionDomain.find({ issue: issue._id })
      .select("_id name type numericRange membershipFunction valueCount")
      .lean(),
  ]);

  if (alternatives.length === 0) {
    throw createInternalError("Finished issue alternatives are required", {
      field: "alternatives",
      details: {
        issueId: toIdString(issue?._id),
      },
    });
  }

  if (orderedLeafCriteria.length === 0) {
    throw createInternalError("Finished issue leaf criteria are required", {
      field: "criteria",
      details: {
        issueId: toIdString(issue?._id),
      },
    });
  }

  const acceptedParticipations = participations.filter(
    (participation) => participation.invitationStatus === "accepted"
  );

  const completedByPhase = allCompletedAlternativeEvaluations.reduce(
    (accumulator, evaluation) => {
      const phase = Number(evaluation?.consensusPhase);
      if (!Number.isInteger(phase) || phase < 1) {
        return accumulator;
      }

      if (!accumulator.has(phase)) {
        accumulator.set(phase, []);
      }

      accumulator.get(phase).push(evaluation);
      return accumulator;
    },
    new Map()
  );

  const model = await ensureModelOrThrow({ issue });
  const finalCriteriaWeights = await resolveFinalCriteriaWeightsOrThrow({
    issue,
    orderedLeafCriteria,
    modelUsesWeights: model?.usesCriteriaWeights === true,
  });
  const leafCount = orderedLeafCriteria.length;
  const criterionNames = orderedLeafCriteria.map((criterion) => criterion.name);
  const criteriaWeightingEvaluationsByExpertId = new Map(
    criteriaWeightingEvaluations.map((evaluation) => [
      toIdString(evaluation?.expert?._id || evaluation?.expert),
      evaluation,
    ])
  );
  const structure = getFinishedAlternativeEvaluationStructureOrThrow({ issue });

  const experts = buildParticipationsSummary({
    participations,
    completedEvaluations: allCompletedAlternativeEvaluations,
  });

  const consensusRounds = [];
  const alternativesRankings = [];
  const expertsRatings = {};

  for (const stageResult of alternativeStageResults) {
    const phase = Number(stageResult.consensusPhase);
    const phaseEvaluations = completedByPhase.get(phase) || [];

    if (phaseEvaluations.length === 0) {
      throw createInternalError(
        "Completed alternative evaluations are missing for a consensus phase",
        {
          field: "evaluations",
          details: {
            issueId: toIdString(issue?._id),
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
      plotsGraphic: stageResult?.plotsGraphic || {},
      evaluations: phaseEvaluations,
    });

    const round = buildConsensusRoundPayloadOrThrow({
      stageResult,
      threshold: issue.consensusThreshold,
    });
    round.plotsGraphic = enrichedPlotsGraphic;

    const expertEvaluations = await buildFinishedExpertEvaluationsByEmail({
      structure,
      evaluations: phaseEvaluations,
      issue,
    });

    const collectiveEvaluationsSource = isPlainObject(stageResult?.collectiveEvaluations)
      ? stageResult.collectiveEvaluations
      : null;
    const collectiveEvaluations =
      collectiveEvaluationsSource &&
      Object.keys(collectiveEvaluationsSource).length > 0
        ? collectiveEvaluationsSource
        : null;

    expertsRatings[phase] = {
      consensusMeasure: round.consensusMeasure,
      collectiveEvaluations,
      collectiveEvaluationsLocalizedByExpert: null,
      expertEvaluations,
      criteriaWeightsEvaluationByExpert: buildCriteriaWeightsEvaluationByExpert({
        issue,
        participations,
        criteriaWeightingEvaluationsByExpertId,
        criterionNames,
      }),
    };

    alternativesRankings.push({
      phase,
      rankedAlternatives: round.rankedAlternatives,
    });

    consensusRounds.push(round);
  }

  const summary = buildSummarySection({
    issue,
    model,
    criteria,
    orderedLeafCriteria,
    alternatives,
    experts,
    consensusInfo: buildConsensusInfo({
      issue,
      consensusRounds,
    }),
  });

  const availableModels = buildAvailableModelsPayload({
    issue,
    allModels,
    issueAlternativeEvaluationStructureKey:
      issue.alternativeEvaluationStructureKey,
    issueDomainSnapshots,
    leafCount,
  });

  const latestRound = consensusRounds[consensusRounds.length - 1];
  const latestRankedAlternatives =
    alternativesRankings[alternativesRankings.length - 1]?.rankedAlternatives || [];

  const modelExecution = latestRound?.modelExecution || {
    rawOutput: latestRound?.rawOutput || {},
  };

  const scatterPlotByPhase = Array(issue.consensusPhase || 0).fill(null);
  for (const stageResult of alternativeStageResults) {
    const phase = Number(stageResult.consensusPhase);
    const phaseEvaluations = completedByPhase.get(phase) || [];
    const plotsGraphic = enrichPlotsGraphicWithExpertLabels({
      plotsGraphic: stageResult?.plotsGraphic || {},
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

  const latestPhaseEvaluations =
    completedByPhase.get(Number(latestRound?.phase)) || [];
  const latestRoundPlotsGraphic = enrichPlotsGraphicWithExpertLabels({
    plotsGraphic: latestRound?.plotsGraphic || {},
    evaluations: latestPhaseEvaluations,
  });

  return {
    summary,
    alternativesRankings,
    expertsRatings,
    finalCriteriaWeights,
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
      rawOutput: latestRound?.rawOutput || {},
      rankedAlternatives: latestRankedAlternatives,
      plotsGraphic: latestRoundPlotsGraphic,
      consensusMeasure: latestRound?.consensusMeasure ?? null,
    },
    modelExecution,
    consensus: consensusRounds,
    consensusHistory: consensusRounds,
    consensusRounds,
    scenarios: [],
    modelParams: buildModelParamsPayloadOrThrow({
      issue,
      model,
      orderedLeafCriteria,
      availableModels,
      domainType: null,
    }),
  };
};
