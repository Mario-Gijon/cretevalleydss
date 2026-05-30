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
import { normalizeConsensusPhaseOrThrow, validateAcceptedEvaluationCoverageOrThrow } from "./finishedPayloadValidation.js";
import { buildRankedAlternativesPayloadOrThrow } from "./buildFinishedRankings.js";
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
import { buildModelExecutionPayload } from "./buildFinishedConsensus.js";
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

export const buildNonConsensusPairwiseFinishedPayload = async ({ issue }) => {
  const latestAlternativeResult = await IssueStageResult.findOne({
    issue: issue._id,
    stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
  })
    .sort({ consensusPhase: -1 })
    .lean();

  if (!latestAlternativeResult) {
    throw createInternalError(
      "Finished issue requires an alternative evaluation stage result",
      {
        field: "stageResult",
        details: {
          issueId: toIdString(issue?._id),
          stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
        },
      }
    );
  }

  const phase = normalizeConsensusPhaseOrThrow({
    value: latestAlternativeResult?.consensusPhase,
    issueId: issue?._id,
    stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
  });
  const criteriaWeightingPhase = await resolveCriteriaWeightingPhase({
    issueId: issue._id,
  });

  const [
    completedAlternativeEvaluations,
    criteriaWeightingEvaluations,
    alternatives,
    orderedLeafCriteria,
    criteria,
    participations,
    allModels,
    issueDomainSnapshots,
  ] = await Promise.all([
    IssueEvaluation.find({
      issue: issue._id,
      stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
      consensusPhase: phase,
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

  const acceptedParticipations = participations.filter(
    (participation) => participation.invitationStatus === "accepted"
  );

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

  validateAcceptedEvaluationCoverageOrThrow({
    acceptedParticipations,
    completedEvaluations: completedAlternativeEvaluations,
    issue,
    phase,
  });

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

  const rankedAlternatives = buildRankedAlternativesPayloadOrThrow({
    stageResult: latestAlternativeResult,
  });

  const structure = getFinishedAlternativeEvaluationStructureOrThrow({ issue });
  const expertEvaluations = await buildFinishedExpertEvaluationsByEmail({
    structure,
    evaluations: completedAlternativeEvaluations,
    issue,
  });

  const collectiveEvaluationsSource = isPlainObject(
    latestAlternativeResult?.collectiveEvaluations
  )
    ? latestAlternativeResult.collectiveEvaluations
    : null;
  const collectiveEvaluations =
    collectiveEvaluationsSource &&
    Object.keys(collectiveEvaluationsSource).length > 0
      ? collectiveEvaluationsSource
      : null;

  const experts = buildParticipationsSummary({
    participations,
    completedEvaluations: completedAlternativeEvaluations,
  });

  const summary = buildSummarySection({
    issue,
    model,
    criteria,
    orderedLeafCriteria,
    alternatives,
    experts,
    consensusInfo: null,
  });

  const availableModels = buildAvailableModelsPayload({
    issue,
    allModels,
    issueAlternativeEvaluationStructureKey:
      issue.alternativeEvaluationStructureKey,
    issueDomainSnapshots,
    leafCount,
  });

  const modelExecution = buildModelExecutionPayload(latestAlternativeResult);
  const enrichedLatestPlotsGraphic = enrichPlotsGraphicWithExpertLabels({
    plotsGraphic: latestAlternativeResult?.plotsGraphic || {},
    evaluations: completedAlternativeEvaluations,
  });

  const consensusDetails = {
    modelExecution,
    rawOutput: latestAlternativeResult?.rawOutput || {},
    rankedAlternatives,
    plotsGraphic: enrichedLatestPlotsGraphic,
    consensusMeasure: latestAlternativeResult?.consensusMeasure ?? null,
  };

  return {
    summary,
    alternativesRankings: [
      {
        phase,
        rankedAlternatives,
      },
    ],
    expertsRatings: {
      [phase]: {
        consensusMeasure: latestAlternativeResult?.consensusMeasure ?? null,
        collectiveEvaluations,
        collectiveEvaluationsLocalizedByExpert: null,
        expertEvaluations,
        criteriaWeightsEvaluationByExpert: buildCriteriaWeightsEvaluationByExpert({
          issue,
          participations,
          criteriaWeightingEvaluationsByExpertId,
          criterionNames,
        }),
      },
    },
    finalCriteriaWeights,
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
    modelParams: buildModelParamsPayloadOrThrow({
      issue,
      model,
      orderedLeafCriteria,
      availableModels,
      domainType: null,
    }),
  };
};
