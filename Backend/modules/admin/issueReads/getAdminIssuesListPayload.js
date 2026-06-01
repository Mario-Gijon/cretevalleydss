import { Alternative } from "../../../models/Alternatives.js";
import { Consensus } from "../../../models/Consensus.js";
import { Criterion } from "../../../models/Criteria.js";
import { IssueEvaluation } from "../../../models/IssueEvaluations.js";
import { Issue } from "../../../models/Issues.js";
import { IssueScenario } from "../../../models/IssueScenarios.js";
import { Participation } from "../../../models/Participations.js";

import { toIdString } from "../../../utils/common/ids.js";
import { isValidObjectIdLike } from "../../../utils/common/mongoose.js";
import {
  getCreatorActionFlags,
  getIssueStageMeta,
} from "./adminIssueReadPayloads.js";
import {
  buildIssueEvaluationStatsByIssue,
  countExpectedEvaluationCellsPerExpert,
} from "./adminIssueProgress.js";

const buildAdminIssuesFilter = ({
  search = "",
  active = "all",
  currentStage = "all",
  isConsensus = "all",
  adminId = "",
  modelId = "",
}) => {
  const normalizedSearch = String(search || "").trim();
  const normalizedActive = String(active || "all").trim().toLowerCase();
  const normalizedStage = String(currentStage || "all").trim();
  const normalizedConsensus = String(isConsensus || "all").trim().toLowerCase();
  const normalizedAdminId = String(adminId || "").trim();
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
    normalizedAdminId &&
    isValidObjectIdLike(normalizedAdminId)
  ) {
    filter.admin = normalizedAdminId;
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
  adminId = "",
  modelId = "",
}) => {
  const filter = buildAdminIssuesFilter({
    search,
    active,
    currentStage,
    isConsensus,
    adminId,
    modelId,
  });

  const issues = await Issue.find(filter)
    .populate("admin", "name email role accountConfirm")
    .populate(
      "model",
      "name alternativeEvaluationStructureKey criteriaWeightingStructureKey lifecycleKind isMultiCriteria supportsConsensus supportsConsensusSimulation"
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

    Consensus.aggregate([
      { $match: { issue: { $in: issueIds } } },
      {
        $group: {
          _id: "$issue",
          totalRounds: { $sum: 1 },
          latestPhase: { $max: "$phase" },
          latestTimestamp: { $max: "$timestamp" },
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
      stage: "alternativeEvaluation",
    })
      .select("issue payload submittedAt")
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

  const evaluationsMap = buildIssueEvaluationStatsByIssue(evaluationsAgg);

  return {
    issues: issues.map((issue) => {
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
        latestPhase: 0,
        latestTimestamp: null,
      };

      const evaluationStats = evaluationsMap.get(issueId) || {
        filledCells: 0,
        lastEvaluationAt: null,
      };

      const alternativeEvaluationStructureKey = issue.alternativeEvaluationStructureKey;

      const modelAlternativeEvaluationStructureKey = issue.model
        ? issue.model.alternativeEvaluationStructureKey
        : null;

      const expectedPerExpert = countExpectedEvaluationCellsPerExpert({
        alternativesCount: totalAlternatives,
        leafCriteriaCount: totalLeafCriteria,
        alternativeEvaluationStructureKey,
      });

      return {
        id: issueId,
        name: issue.name,
        description: issue.description,
        active: issue.active,
        currentStage: issue.currentStage,
        currentStageMeta: getIssueStageMeta(issue.currentStage),
        weightingMode: issue.weightingMode,
        isConsensus: issue.isConsensus,
        simulateConsensus: issue.simulateConsensus === true,
        consensusMaxPhases: issue.consensusMaxPhases,
        consensusThreshold: issue.consensusThreshold,
        creationDate: issue.creationDate,
        closureDate: issue.closureDate,
        alternativeEvaluationStructureKey: issue.alternativeEvaluationStructureKey,
        criteriaWeightingStructureKey: issue.criteriaWeightingStructureKey,
        admin: issue.admin
          ? {
            id: toIdString(issue.admin._id),
            name: issue.admin.name,
            email: issue.admin.email,
            role: issue.admin.role,
            accountConfirm: issue.admin.accountConfirm,
          }
          : null,
        model: issue.model
          ? {
            id: toIdString(issue.model._id),
            name: issue.model.name,
            alternativeEvaluationStructureKey:
              modelAlternativeEvaluationStructureKey,
            criteriaWeightingStructureKey:
              issue.model.criteriaWeightingStructureKey,
            isConsensus:
              issue.model.lifecycleKind === "thresholdConsensus",
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
          latestConsensusPhase: consensusStats.latestPhase || 0,
          latestConsensusAt: consensusStats.latestTimestamp || null,
          scenarios: scenariosMap.get(issueId) || 0,
          expectedEvaluationCellsPerExpert: expectedPerExpert,
          totalFilledEvaluationCells: evaluationStats.filledCells || 0,
          lastEvaluationAt: evaluationStats.lastEvaluationAt || null,
        },
        creatorActionsState: getCreatorActionFlags({
          issue,
          acceptedExperts: participationStats.acceptedExperts || 0,
          pendingExperts: participationStats.pendingExperts || 0,
          weightsDoneAccepted: participationStats.weightsDoneAccepted || 0,
          evaluationsDoneAccepted:
            participationStats.evaluationsDoneAccepted || 0,
        }),
      };
    }),
  };
};
