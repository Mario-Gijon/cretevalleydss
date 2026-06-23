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
} from "../../../decisionPlugins/evaluations/evaluationStages.js";
import { createInternalError } from "../../../../utils/common/errors.js";
import { toIdString } from "../../../../utils/common/ids.js";

const ISSUE_MODELS_SELECT =
  "_id name evaluationStructureKey supportsConsensus isMultiCriteria usesCriteriaWeights usesFuzzyCriteriaWeights usesCriterionTypes smallDescription moreInfoUrl parameters supportedDomains implementationStatus publicUsable";

const loadAvailableIssueModels = async () => {
  return IssueModel.find({
    modelKind: "issue",
    visibleInIssueCreation: true,
    "manifestSync.isStale": false,
  })
    .select(ISSUE_MODELS_SELECT)
    .lean();
};

export const loadLatestAlternativeStageResultOrThrow = async ({ issue }) => {
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
          issueId: toIdString(issue._id),
          stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
        },
      }
    );
  }

  return latestAlternativeResult;
};

export const loadConsensusAlternativeStageResultsOrThrow = async ({ issue }) => {
  const alternativeStageResults = await IssueStageResult.find({
    issue: issue._id,
    stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
  })
    .sort({ consensusPhase: 1 })
    .lean();

  if (alternativeStageResults.length === 0) {
    throw createInternalError(
      "Finished consensus issue requires alternative evaluation stage results",
      {
        field: "stageResults",
        details: {
          issueId: toIdString(issue._id),
          stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
        },
      }
    );
  }

  return alternativeStageResults;
};

export const loadFinishedSinglePhaseData = async ({
  issue,
  phase,
  criteriaWeightingPhase,
}) => {
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
    loadAvailableIssueModels(),
    IssueExpressionDomain.find({ issue: issue._id })
      .select("_id name type numericRange membershipFunction valueCount")
      .lean(),
  ]);

  return {
    completedAlternativeEvaluations,
    criteriaWeightingEvaluations,
    alternatives,
    orderedLeafCriteria,
    criteria,
    participations,
    allModels,
    issueDomainSnapshots,
  };
};

export const loadFinishedConsensusData = async ({
  issue,
  phaseList,
  criteriaWeightingPhase,
}) => {
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
    loadAvailableIssueModels(),
    IssueExpressionDomain.find({ issue: issue._id })
      .select("_id name type numericRange membershipFunction valueCount")
      .lean(),
  ]);

  return {
    alternatives,
    orderedLeafCriteria,
    criteria,
    participations,
    allCompletedAlternativeEvaluations,
    criteriaWeightingEvaluations,
    allModels,
    issueDomainSnapshots,
  };
};

export const groupCompletedEvaluationsByPhase = ({ evaluations }) => {
  return evaluations.reduce(
    (accumulator, evaluation) => {
      const phase = Number(evaluation.consensusPhase);

      if (!Number.isInteger(phase) || phase < 0) {
        throw createInternalError(
          "Finished evaluation consensusPhase is invalid",
          {
            field: "consensusPhase",
            details: {
              issueId: toIdString(evaluation.issue) || null,
              evaluationId: toIdString(evaluation._id) || null,
              consensusPhase: evaluation.consensusPhase,
            },
          }
        );
      }

      if (!accumulator.has(phase)) {
        accumulator.set(phase, []);
      }

      accumulator.get(phase).push(evaluation);
      return accumulator;
    },
    new Map()
  );
};
