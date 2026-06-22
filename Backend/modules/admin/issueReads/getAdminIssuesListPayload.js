import { Alternative } from "../../../models/Alternatives.js";
import { Criterion } from "../../../models/Criteria.js";
import { IssueEvaluation } from "../../../models/IssueEvaluations.js";
import { Issue } from "../../../models/Issues.js";
import { IssueScenario } from "../../../models/IssueScenarios.js";
import { IssueStageResult } from "../../../models/IssueStageResults.js";
import { Participation } from "../../../models/Participations.js";

import { toIdString } from "../../../utils/common/ids.js";
import { isValidObjectIdLike } from "../../../utils/common/mongoose.js";
import { EVALUATION_STAGES } from "../../decisionPlugins/evaluations/evaluationStages.js";
import {
  getOwnerActionFlags,
  getIssueStageMeta,
} from "./adminIssueReadPayloads.js";
import {
  buildIssueEvaluationStatsByIssue,
  resolveExpectedEvaluationCellsPerExpert,
} from "./adminIssueProgress.js";

const buildAdminIssuesFilter = ({
  search = "",
  active = "all",
  currentStage = "all",
  isConsensus = "all",
  ownerId = "",
  modelId = "",
}) => {
  const normalizedSearch = String(search || "").trim();
  const normalizedActive = String(active || "all").trim().toLowerCase();
  const normalizedStage = String(currentStage || "all").trim();
  const normalizedConsensus = String(isConsensus || "all").trim().toLowerCase();
  const normalizedOwnerId = String(ownerId || "").trim();
  const normalizedModelId = String(modelId || "").trim();

  const filter = {};

  if (normalizedSearch) {
    filter.$or = [
      { name: { $regex: normalizedSearch, $options: "i" } },
      { description: { $regex: normalizedSearch, $options: "i" } },
    ];
  }

  if (normalizedActive === "true") {
    filter.active = true;
  } else if (normalizedActive === "false") {
    filter.active = false;
  }

  if (normalizedStage && normalizedStage !== "all") {
    filter.currentStage = normalizedStage;
  }

  if (normalizedConsensus === "true") {
    filter.isConsensus = true;
  } else if (normalizedConsensus === "false") {
    filter.isConsensus = false;
  }

  if (
    normalizedOwnerId &&
    isValidObjectIdLike(normalizedOwnerId)
  ) {
    filter.ownerId = normalizedOwnerId;
  }

  if (
    normalizedModelId &&
    isValidObjectIdLike(normalizedModelId)
  ) {
    filter.model = normalizedModelId;
  }

  return filter;
};

export const getAdminIssuesListPayload = async ({
  search = "",
  active = "all",
  currentStage = "all",
  isConsensus = "all",
  ownerId = "",
  modelId = "",
}) => {
  const filter = buildAdminIssuesFilter({
    search,
    active,
    currentStage,
    isConsensus,
    ownerId,
    modelId,
  });

  const issues = await Issue.find(filter)
    .populate("ownerId", "name email role accountConfirm")
    .populate("createdBy", "name email role accountConfirm")
    .populate(
      "model",
      "name evaluationStructureKey criteriaWeightsStructureKey isMultiCriteria supportsConsensus supportsConsensusSimulation"
    )
    .sort({ active: -1, creationDate: -1, name: 1 })
    .lean();

  if (!issues.length) {
    return {
      issues: [],
    };
  }

  const issueIds = issues.map((issue) => issue._id);

  const [
    alternativesAgg,
    leafCriteriaAgg,
    participationsAgg,
    consensusAgg,
    scenariosAgg,
    evaluationsAgg,
  ] = await Promise.all([
    Alternative.aggregate([
      { $match: { issue: { $in: issueIds } } },
      {
        $group: {
          _id: "$issue",
          total: { $sum: 1 },
        },
      },
    ]),

    Criterion.aggregate([
      { $match: { issue: { $in: issueIds }, isLeaf: true } },
      {
        $group: {
          _id: "$issue",
          total: { $sum: 1 },
        },
      },
    ]),

    Participation.aggregate([
      { $match: { issue: { $in: issueIds } } },
      {
        $group: {
          _id: "$issue",
          totalExperts: { $sum: 1 },
          acceptedExperts: {
            $sum: {
              $cond: [{ $eq: ["$invitationStatus", "accepted"] }, 1, 0],
            },
          },
          pendingExperts: {
            $sum: {
              $cond: [{ $eq: ["$invitationStatus", "pending"] }, 1, 0],
            },
          },
          declinedExperts: {
            $sum: {
              $cond: [{ $eq: ["$invitationStatus", "declined"] }, 1, 0],
            },
          },
          weightsDoneAccepted: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$invitationStatus", "accepted"] },
                    { $eq: ["$weightsCompleted", true] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          evaluationsDoneAccepted: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$invitationStatus", "accepted"] },
                    { $eq: ["$evaluationCompleted", true] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]),

    IssueStageResult.aggregate([
      {
        $match: {
          issue: { $in: issueIds },
          stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
        },
      },
      { $sort: { issue: 1, consensusPhase: -1, updatedAt: -1, createdAt: -1 } },
      {
        $group: {
          _id: "$issue",
          totalRounds: { $sum: 1 },
          latestPhase: { $first: "$consensusPhase" },
          latestConsensusMeasure: { $first: "$consensusMeasure" },
          latestComputedAt: {
            $first: { $ifNull: ["$updatedAt", "$createdAt"] },
          },
        },
      },
    ]),

    IssueScenario.aggregate([
      { $match: { issue: { $in: issueIds } } },
      {
        $group: {
          _id: "$issue",
          total: { $sum: 1 },
        },
      },
    ]),

    IssueEvaluation.find({
      issue: { $in: issueIds },
      stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
    })
      .select("issue completed submittedAt updatedAt")
      .lean(),
  ]);

  const alternativesMap = new Map(
    alternativesAgg.map((row) => [toIdString(row._id), row.total || 0])
  );

  const leafCriteriaMap = new Map(
    leafCriteriaAgg.map((row) => [toIdString(row._id), row.total || 0])
  );

  const participationsMap = new Map(
    participationsAgg.map((row) => [toIdString(row._id), row])
  );

  const consensusMap = new Map(
    consensusAgg.map((row) => [toIdString(row._id), row])
  );

  const scenariosMap = new Map(
    scenariosAgg.map((row) => [toIdString(row._id), row.total || 0])
  );

  const issuesById = new Map(issues.map((issue) => [toIdString(issue._id), issue]));

  const evaluationsMap = await buildIssueEvaluationStatsByIssue({
    evaluationDocs: evaluationsAgg,
    issuesById,
  });

  return {
    issues: await Promise.all(issues.map(async (issue) => {
      const issueId = toIdString(issue._id);

      const totalAlternatives = alternativesMap.get(issueId) || 0;
      const totalLeafCriteria = leafCriteriaMap.get(issueId) || 0;

      const participationStats = participationsMap.get(issueId) || {
        totalExperts: 0,
        acceptedExperts: 0,
        pendingExperts: 0,
        declinedExperts: 0,
        weightsDoneAccepted: 0,
        evaluationsDoneAccepted: 0,
      };

      const consensusStats = consensusMap.get(issueId) || {
        totalRounds: 0,
        latestPhase: null,
        latestConsensusMeasure: null,
        latestComputedAt: null,
      };

      const evaluationStats = evaluationsMap.get(issueId) || {
        totalDocs: 0,
        submittedDocs: 0,
        draftDocs: 0,
        lastEvaluationAt: null,
      };

      const modelAlternativeEvaluationStructureKey = issue.model
        ? issue.model.evaluationStructureKey
        : null;

      const expectedPerExpert = await resolveExpectedEvaluationCellsPerExpert();

      return {
        id: issueId,
        name: issue.name,
        description: issue.description,
        active: issue.active,
        currentStage: issue.currentStage,
        currentStageMeta: getIssueStageMeta(issue.currentStage),
        isConsensus: issue.isConsensus,
        simulateConsensus: issue.simulateConsensus === true,
        consensusMaxPhases: issue.consensusMaxPhases,
        consensusThreshold: issue.consensusThreshold,
        creationDate: issue.creationDate,
        closureDate: issue.closureDate,
        evaluationStructureKey: issue.evaluationStructureKey,
        criteriaWeightsStructureKey: issue.criteriaWeightsStructureKey,
        owner: issue.ownerId
          ? {
            id: toIdString(issue.ownerId._id),
            name: issue.ownerId.name,
            email: issue.ownerId.email,
            role: issue.ownerId.role,
            accountConfirm: issue.ownerId.accountConfirm,
          }
          : null,
        createdBy: issue.createdBy
          ? {
            id: toIdString(issue.createdBy._id),
            name: issue.createdBy.name,
            email: issue.createdBy.email,
            role: issue.createdBy.role,
            accountConfirm: issue.createdBy.accountConfirm,
          }
          : null,
        model: issue.model
          ? {
            id: toIdString(issue.model._id),
            name: issue.model.name,
            modelKind: issue.model.modelKind,
            evaluationStructureKey: modelAlternativeEvaluationStructureKey,
            supportsConsensus: issue.model.supportsConsensus === true,
            supportsConsensusSimulation:
              issue.model.supportsConsensusSimulation === true,
            isMultiCriteria: issue.model.isMultiCriteria,
          }
          : null,
        metrics: {
          totalAlternatives,
          totalLeafCriteria,
          totalExperts: participationStats.totalExperts || 0,
          acceptedExperts: participationStats.acceptedExperts || 0,
          pendingExperts: participationStats.pendingExperts || 0,
          declinedExperts: participationStats.declinedExperts || 0,
          weightsDoneAccepted: participationStats.weightsDoneAccepted || 0,
          evaluationsDoneAccepted:
            participationStats.evaluationsDoneAccepted || 0,
          consensusRounds: consensusStats.totalRounds || 0,
          latestConsensusPhase: consensusStats.latestPhase ?? null,
          latestConsensusMeasure:
            consensusStats.latestConsensusMeasure ?? null,
          latestConsensusAt: consensusStats.latestComputedAt ?? null,
          scenarios: scenariosMap.get(issueId) || 0,
          expectedEvaluationCellsPerExpert: expectedPerExpert,
          totalFilledEvaluationCells: evaluationStats.submittedDocs || 0,
          totalSubmittedEvaluationDocs: evaluationStats.submittedDocs || 0,
          totalDraftEvaluationDocs: evaluationStats.draftDocs || 0,
          lastEvaluationAt: evaluationStats.lastEvaluationAt || null,
        },
        ownerActionsState: getOwnerActionFlags({
          issue,
          acceptedExperts: participationStats.acceptedExperts || 0,
          pendingExperts: participationStats.pendingExperts || 0,
          weightsDoneAccepted: participationStats.weightsDoneAccepted || 0,
          evaluationsDoneAccepted:
            participationStats.evaluationsDoneAccepted || 0,
        }),
      };
    })),
  };
};
