import mongoose from "mongoose";


import { Alternative } from "../../models/Alternatives.js";
import { User } from "../../models/Users.js";
import { Consensus } from "../../models/Consensus.js";
import { Criterion } from "../../models/Criteria.js";
import { IssueEvaluation } from "../../models/IssueEvaluations.js";
import { ExitUserIssue } from "../../models/ExitUserIssue.js";
import { IssueExpressionDomain } from "../../models/IssueExpressionDomains.js";
import { Issue } from "../../models/Issues.js";
import { IssueScenario } from "../../models/IssueScenarios.js";
import { IssueStageResult } from "../../models/IssueStageResults.js";
import { Participation } from "../../models/Participations.js";


import {
  ensureIssueOrdersDb,
  getOrderedAlternativesDb,
  getOrderedLeafCriteriaDb,
} from "../issues/shared/ordering.js";
import {
  buildExpressionDomainConfigFromLeafCriteriaOrThrow,
} from "../expressionDomains/buildIssueDomainConfig.js";

import {
  createBadRequestError,
  createNotFoundError,
} from "../../utils/common/errors.js";
import { toIdString } from "../../utils/common/ids.js";
import { isValidObjectIdLike } from "../../utils/common/mongoose.js";
import { isPlainObject } from "../../utils/common/objects.js";

const sortByNameStable = (a, b) => {
  const byName = a.name.localeCompare(
    b.name,
    undefined,
    {
      sensitivity: "base",
      numeric: true,
    }
  );

  if (byName !== 0) return byName;

  return toIdString(a).localeCompare(toIdString(b));
};

const buildCriteriaTreeAdmin = (criteriaDocs) => {
  const nodes = criteriaDocs.map((criterion) => ({
    id: toIdString(criterion._id),
    name: criterion.name,
    type: criterion.type,
    isLeaf: criterion.isLeaf,
    parentId: criterion.parentCriterion
      ? toIdString(criterion.parentCriterion)
      : null,
    children: [],
  }));

  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const roots = [];

  for (const node of nodes) {
    if (node.parentId && nodesById.has(node.parentId)) {
      nodesById.get(node.parentId).children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortRecursively = (items) => {
    items.sort(sortByNameStable);

    items.forEach((item) => {
      if (item.children.length > 0) {
        sortRecursively(item.children);
      }
    });
  };

  sortRecursively(roots);

  return roots;
};

const countExpectedEvaluationCellsPerExpert = ({
  alternativesCount,
  leafCriteriaCount,
  alternativeEvaluationStructureKey,
}) => {
  if (!alternativesCount || !leafCriteriaCount) {
    return 0;
  }

  if (
    alternativeEvaluationStructureKey ===
    "alternativePairwiseByCriterion"
  ) {
    return (
      alternativesCount *
      leafCriteriaCount *
      Math.max(alternativesCount - 1, 0)
    );
  }

  return alternativesCount * leafCriteriaCount;
};

const getIssueStageMeta = (stage) => {
  const stageMap = {
    criteriaWeighting: {
      key: "criteriaWeighting",
      label: "Criteria weighting",
    },
    weightsFinished: {
      key: "weightsFinished",
      label: "Weights finished",
    },
    alternativeEvaluation: {
      key: "alternativeEvaluation",
      label: "Alternative evaluation",
    },
    finished: {
      key: "finished",
      label: "Finished",
    },
  };

  return stageMap[stage] || { key: stage, label: stage || "Unknown" };
};

const getCreatorActionFlags = ({
  issue,
  acceptedExperts = 0,
  pendingExperts = 0,
  weightsDoneAccepted = 0,
  evaluationsDoneAccepted = 0,
}) => {
  const stage = issue.currentStage;
  const hasPendingExperts = pendingExperts > 0;

  const allWeightsDone =
    acceptedExperts > 0 && weightsDoneAccepted === acceptedExperts;

  const allEvaluationsDone =
    acceptedExperts > 0 && evaluationsDoneAccepted === acceptedExperts;

  return {
    canEditExperts: issue.active,
    canRemoveIssue: issue.active,
    canComputeWeights:
      stage === "weightsFinished" && !hasPendingExperts && allWeightsDone,
    canResolveIssue:
      stage === "alternativeEvaluation" &&
      !hasPendingExperts &&
      allEvaluationsDone,
  };
};

const buildParticipantExpertPayload = (expert, fallbackId = "") => {
  if (!expert) {
    return {
      id: fallbackId,
      name: "Deleted user",
      email: "Deleted user",
      role: "user",
      university: "",
      accountConfirm: false,
    };
  }

  return {
    id: toIdString(expert._id),
    name: expert.name,
    email: expert.email,
    role: expert.role,
    university: expert.university,
    accountConfirm: expert.accountConfirm,
  };
};

export const getIssueAdminDetailPayload = async ({ issueId }) => {
  if (!issueId || !isValidObjectIdLike(issueId)) {
    throw createBadRequestError("Valid issue id is required", {
      field: "issueId",
    });
  }

  let issue = await Issue.findById(issueId)
    .populate("admin", "name email role accountConfirm")
    .populate(
      "model",
      "name alternativeEvaluationStructureKey criteriaWeightingStructureKey lifecycleKind isMultiCriteria parameters supportedDomains supportsConsensus supportsConsensusSimulation"
    )
    .lean();

  if (!issue) {
    throw createNotFoundError("Issue not found", {
      field: "issueId",
    });
  }

  const orderedIssue = await ensureIssueOrdersDb({ issueId });

  issue = {
    ...issue,
    alternativeOrder: orderedIssue.alternativeOrder,
    leafCriteriaOrder: orderedIssue.leafCriteriaOrder,
  };

  const [
    orderedAlternatives,
    orderedLeafCriteria,
    allCriteria,
    participations,
    exits,
    consensusDocs,
    scenarios,
    snapshots,
    evaluationDocs,
    weightDocs,
  ] = await Promise.all([
    getOrderedAlternativesDb({
      issueId,
      issueDoc: issue,
      select: "_id name",
      lean: true,
    }),
    getOrderedLeafCriteriaDb({
      issueId,
      issueDoc: issue,
      select: "_id name type isLeaf parentCriterion expressionDomain",
      lean: true,
    }),
    Criterion.find({ issue: issueId }).lean(),
    Participation.find({ issue: issueId })
      .populate("expert", "name email role university accountConfirm")
      .lean(),
    ExitUserIssue.find({ issue: issueId, hidden: true })
      .populate("user", "name email role university accountConfirm")
      .lean(),
    Consensus.find({ issue: issueId }).sort({ phase: 1 }).lean(),
    IssueScenario.find({ issue: issueId })
      .sort({ createdAt: -1 })
      .select(
        "_id name targetModel targetModelName domainType alternativeEvaluationStructureKey criteriaWeightingStructureKey status createdAt createdBy"
      )
      .populate("createdBy", "name email")
      .lean(),
    IssueExpressionDomain.find({ issue: issueId }).lean(),
    IssueEvaluation.find({
      issue: issueId,
      stage: "alternativeEvaluation",
    })
      .select("expert payload completed submittedAt")
      .lean(),
    IssueEvaluation.find({
      issue: issueId,
      stage: "criteriaWeighting",
    })
      .select("expert payload completed submittedAt")
      .lean(),
  ]);

  const issueEvaluationStructure = issue.alternativeEvaluationStructureKey;
  const alternativesCount = orderedAlternatives.length;
  const leafCriteriaCount = orderedLeafCriteria.length;

  const expectedPerExpert = countExpectedEvaluationCellsPerExpert({
    alternativesCount,
    leafCriteriaCount,
    alternativeEvaluationStructureKey: issueEvaluationStructure,
  });

  const criteriaTree = buildCriteriaTreeAdmin(allCriteria);

  const finalWeightsArray = issue.modelParameters.weights;

  const finalWeightsById = {};
  const finalWeightsByName = {};

  orderedLeafCriteria.forEach((criterion, index) => {
    const value = finalWeightsArray[index];
    finalWeightsById[toIdString(criterion._id)] = value;
    finalWeightsByName[criterion.name] = value;
  });

  const evaluationAggMap = buildIssueEvaluationStatsByExpert(evaluationDocs);

  const weightDocMap = new Map(
    weightDocs.map((weightDoc) => [toIdString(weightDoc.expert), weightDoc])
  );

  const exitMap = new Map(
    exits.map((exit) => [
      toIdString(exit.user?._id || exit.user),
      {
        hidden: exit.hidden,
        timestamp: exit.timestamp,
        phase: exit.phase,
        stage: exit.stage,
        reason: exit.reason,
        history: exit.history,
        user: exit.user
          ? {
            id: toIdString(exit.user._id),
            name: exit.user.name,
            email: exit.user.email,
            role: exit.user.role,
            university: exit.user.university,
            accountConfirm: exit.user.accountConfirm,
          }
          : null,
      },
    ])
  );

  const participantsDetailed = participations.map((participation) => {
    const expertId = toIdString(participation.expert?._id || participation.expert);
    const evaluationStats = evaluationAggMap.get(expertId) || {
      totalDocs: 0,
      filledDocs: 0,
      lastEvaluationAt: null,
    };
    const weightDoc = weightDocMap.get(expertId) || null;
    const exitInfo = exitMap.get(expertId) || null;

    return {
      expert: buildParticipantExpertPayload(participation.expert, expertId),
      currentParticipant: true,
      invitationStatus: participation.invitationStatus,
      weightsCompleted: participation.weightsCompleted,
      evaluationCompleted: participation.evaluationCompleted,
      joinedAt: participation.joinedAt,
      entryPhase: participation.entryPhase,
      entryStage: participation.entryStage,
      progress: {
        expectedEvaluationCells: expectedPerExpert,
        totalEvaluationDocs: evaluationStats.totalDocs,
        filledEvaluationDocs: evaluationStats.filledDocs,
        evaluationProgressPct:
          expectedPerExpert > 0
            ? (evaluationStats.filledDocs / expectedPerExpert) * 100
            : 0,
        lastEvaluationAt: evaluationStats.lastEvaluationAt,
        hasWeightDoc: !!weightDoc,
        weightDocCompleted: weightDoc?.completed,
        weightDocPhase: weightDoc?.consensusPhase,
        weightDocUpdatedAt: weightDoc?.updatedAt,
      },
      exitInfo,
    };
  });

  const currentParticipantIds = new Set(
    participations.map((participation) =>
      toIdString(participation.expert?._id || participation.expert)
    )
  );

  const exitedUsersDetailed = exits
    .filter(
      (exit) => !currentParticipantIds.has(toIdString(exit.user?._id || exit.user))
    )
    .map((exit) => ({
      expert: buildParticipantExpertPayload(exit.user, toIdString(exit.user)),
      currentParticipant: false,
      exitInfo: {
        hidden: exit.hidden,
        timestamp: exit.timestamp,
        phase: exit.phase,
        stage: exit.stage,
        reason: exit.reason,
        history: exit.history,
      },
    }));

  const acceptedExperts = participations.filter(
    (participation) => participation.invitationStatus === "accepted"
  );
  const pendingExperts = participations.filter(
    (participation) => participation.invitationStatus === "pending"
  );
  const declinedExperts = participations.filter(
    (participation) => participation.invitationStatus === "declined"
  );

  const latestConsensus = consensusDocs.length
    ? consensusDocs[consensusDocs.length - 1]
    : null;

  const snapshotsSummary = {
    total: snapshots.length,
    numeric: snapshots.filter((domain) => domain.type === "numeric").length,
    linguistic: snapshots.filter((domain) => domain.type === "linguistic")
      .length,
  };

  const totalFilledEvaluationCells = Array.from(
    evaluationAggMap.values()
  ).reduce((accumulator, row) => accumulator + (row.filledDocs || 0), 0);
  const expressionDomainConfig =
    buildExpressionDomainConfigFromLeafCriteriaOrThrow({
      leafCriteria: orderedLeafCriteria,
      field: "expressionDomain",
    });

  const acceptedExpertsWithWeightsDone = acceptedExperts.filter(
    (item) => item.weightsCompleted
  ).length;

  const acceptedExpertsWithEvaluationsDone = acceptedExperts.filter(
    (item) => item.evaluationCompleted
  ).length;

  return {
    issue: {
      id: toIdString(issue._id),
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
          isConsensus:
            issue.model.lifecycleKind === "thresholdConsensus",
          supportsConsensus: issue.model.supportsConsensus === true,
          supportsConsensusSimulation:
            issue.model.supportsConsensusSimulation === true,
          isMultiCriteria: issue.model.isMultiCriteria,
          supportedDomains: issue.model.supportedDomains,
          parameters: issue.model.parameters,
        }
        : null,
      alternatives: orderedAlternatives.map((alternative) => ({
        id: toIdString(alternative._id),
        name: alternative.name,
      })),
      criteria: criteriaTree,
      leafCriteria: orderedLeafCriteria.map((criterion) => ({
        id: toIdString(criterion._id),
        name: criterion.name,
        type: criterion.type,
        expressionDomain: formatIssueSnapshotDomain(criterion.expressionDomain),
      })),
      finalWeights: finalWeightsByName,
      finalWeightsById,
      modelParameters: issue.modelParameters,
      expressionDomainConfig,
      snapshots: snapshotsSummary,
      consensus: {
        rounds: consensusDocs.length,
        latestPhase: latestConsensus?.phase,
        latestLevel: latestConsensus?.level,
        latestAt: latestConsensus?.timestamp,
      },
      scenarios: scenarios.map((scenario) => ({
        id: toIdString(scenario._id),
        name: scenario.name,
        targetModelId: toIdString(scenario.targetModel),
        targetModelName: scenario.targetModelName,
        domainType: scenario.domainType,
        alternativeEvaluationStructureKey: scenario.alternativeEvaluationStructureKey,
        criteriaWeightingStructureKey: scenario.criteriaWeightingStructureKey,
        status: scenario.status,
        createdAt: scenario.createdAt,
        createdBy: scenario.createdBy
          ? {
            id: toIdString(scenario.createdBy._id),
            name: scenario.createdBy.name,
            email: scenario.createdBy.email,
          }
          : null,
      })),
      metrics: {
        totalAlternatives: alternativesCount,
        totalCriteria: allCriteria.length,
        totalLeafCriteria: leafCriteriaCount,
        totalExperts: participations.length,
        acceptedExperts: acceptedExperts.length,
        pendingExperts: pendingExperts.length,
        declinedExperts: declinedExperts.length,
        weightsDoneAccepted: acceptedExpertsWithWeightsDone,
        evaluationsDoneAccepted: acceptedExpertsWithEvaluationsDone,
        expectedEvaluationCellsPerExpert: expectedPerExpert,
        totalFilledEvaluationCells,
      },
      creatorActionsState: getCreatorActionFlags({
        issue,
        acceptedExperts: acceptedExperts.length,
        pendingExperts: pendingExperts.length,
        weightsDoneAccepted: acceptedExpertsWithWeightsDone,
        evaluationsDoneAccepted: acceptedExpertsWithEvaluationsDone,
      }),
      participants: participantsDetailed.sort((a, b) =>
        a.expert.email.localeCompare(
          b.expert.email,
          undefined,
          { sensitivity: "base" }
        )
      ),
      exitedUsers: exitedUsersDetailed.sort((a, b) =>
        a.expert.email.localeCompare(
          b.expert.email,
          undefined,
          { sensitivity: "base" }
        )
      ),
    },
  };
};

const buildExpertProgressRow = ({
  expert,
  expertId,
  currentParticipant,
  participation = null,
  exit = null,
  evaluationStats,
  weightDoc = null,
  expectedEvaluationCells,
}) => ({
  expert: buildParticipantExpertPayload(expert, expertId),
  currentParticipant,
  invitationStatus: currentParticipant
    ? participation?.invitationStatus
    : "exited",
  weightsCompleted: currentParticipant
    ? participation?.weightsCompleted
    : weightDoc?.completed,
  evaluationCompleted: currentParticipant
    ? participation?.evaluationCompleted
    : false,
  joinedAt: currentParticipant ? participation?.joinedAt : null,
  entryPhase: currentParticipant ? participation?.entryPhase : null,
  entryStage: currentParticipant ? participation?.entryStage : null,
  exitInfo: exit
    ? {
      hidden: exit.hidden,
      timestamp: exit.timestamp,
      phase: exit.phase,
      stage: exit.stage,
      reason: exit.reason,
    }
    : null,
  progress: {
    expectedEvaluationCells,
    totalEvaluationDocs: evaluationStats.totalDocs,
    filledEvaluationDocs: evaluationStats.filledDocs,
    evaluationProgressPct:
      expectedEvaluationCells > 0
        ? ((evaluationStats.filledDocs || 0) / expectedEvaluationCells) * 100
        : 0,
    lastEvaluationAt: evaluationStats.lastEvaluationAt,
    hasWeightDoc: !!weightDoc,
    weightDocCompleted: weightDoc?.completed,
    weightDocPhase: weightDoc?.consensusPhase,
    weightDocUpdatedAt: weightDoc?.updatedAt,
  },
});

export const getIssueExpertsProgressPayload = async ({ issueId }) => {
  if (!issueId || !isValidObjectIdLike(issueId)) {
    throw createBadRequestError("Valid issue id is required", {
      field: "issueId",
    });
  }

  let issue = await Issue.findById(issueId)
    .populate(
      "model",
      "name alternativeEvaluationStructureKey criteriaWeightingStructureKey supportsConsensus supportsConsensusSimulation"
    )
    .lean();

  if (!issue) {
    throw createNotFoundError("Issue not found", {
      field: "issueId",
    });
  }

  const orderedIssue = await ensureIssueOrdersDb({ issueId });

  issue = {
    ...issue,
    alternativeOrder: orderedIssue.alternativeOrder,
    leafCriteriaOrder: orderedIssue.leafCriteriaOrder,
  };

  const [
    alternatives,
    leafCriteria,
    participations,
    exits,
    evaluationAgg,
    weightDocs,
  ] = await Promise.all([
    getOrderedAlternativesDb({
      issueId,
      issueDoc: issue,
      select: "_id name",
      lean: true,
    }),
    getOrderedLeafCriteriaDb({
      issueId,
      issueDoc: issue,
      select: "_id name",
      lean: true,
    }),
    Participation.find({ issue: issueId })
      .populate("expert", "name email role university accountConfirm")
      .lean(),
    ExitUserIssue.find({ issue: issueId, hidden: true })
      .populate("user", "name email role university accountConfirm")
      .lean(),
    IssueEvaluation.find({
      issue: issueId,
      stage: "alternativeEvaluation",
    })
      .select("expert payload completed submittedAt")
      .lean(),
    IssueEvaluation.find({
      issue: issueId,
      stage: "criteriaWeighting",
    })
      .select("expert payload completed submittedAt")
      .lean(),
  ]);

  const alternativeEvaluationStructureKey = issue.alternativeEvaluationStructureKey;

  const expectedPerExpert = countExpectedEvaluationCellsPerExpert({
    alternativesCount: alternatives.length,
    leafCriteriaCount: leafCriteria.length,
    alternativeEvaluationStructureKey,
  });

  const evaluationMap = buildIssueEvaluationStatsByExpert(evaluationAgg);

  const weightMap = new Map(
    weightDocs.map((weightDoc) => [toIdString(weightDoc.expert), weightDoc])
  );

  const currentParticipantIds = new Set(
    participations.map((participation) =>
      toIdString(participation.expert?._id || participation.expert)
    )
  );

  const rows = participations.map((participation) => {
    const expertId = toIdString(participation.expert?._id || participation.expert);

    return buildExpertProgressRow({
      expert: participation.expert,
      expertId,
      currentParticipant: true,
      participation,
      evaluationStats: evaluationMap.get(expertId) || {
        totalDocs: 0,
        filledDocs: 0,
        lastEvaluationAt: null,
      },
      weightDoc: weightMap.get(expertId),
      expectedEvaluationCells: expectedPerExpert,
    });
  });

  for (const exit of exits) {
    const expertId = toIdString(exit.user?._id || exit.user);

    if (currentParticipantIds.has(expertId)) {
      continue;
    }

    rows.push(
      buildExpertProgressRow({
        expert: exit.user,
        expertId,
        currentParticipant: false,
        exit,
        evaluationStats: evaluationMap.get(expertId) || {
          totalDocs: 0,
          filledDocs: 0,
          lastEvaluationAt: null,
        },
        weightDoc: weightMap.get(expertId),
        expectedEvaluationCells: expectedPerExpert,
      })
    );
  }

  rows.sort((a, b) => {
    if (a.currentParticipant !== b.currentParticipant) {
      return a.currentParticipant ? -1 : 1;
    }

    return a.expert.email.localeCompare(
      b.expert.email,
      undefined,
      { sensitivity: "base" }
    );
  });

  return {
    issue: {
      id: toIdString(issue._id),
      name: issue.name,
      currentStage: issue.currentStage,
      weightingMode: issue.weightingMode,
      active: issue.active,
      alternativeEvaluationStructureKey: issue.alternativeEvaluationStructureKey,
      criteriaWeightingStructureKey: issue.criteriaWeightingStructureKey,
      model: issue.model
        ? {
          id: toIdString(issue.model._id),
          name: issue.model.name,
          alternativeEvaluationStructureKey:
            issue.model.alternativeEvaluationStructureKey,
          criteriaWeightingStructureKey:
            issue.model.criteriaWeightingStructureKey,
        }
        : null,
    },
    experts: rows,
  };
};

const isFilledValue = (value) =>
  !(value === null || value === undefined || value === "");

const countPayloadCells = (payload = {}) => {
  if (payload?.cells && typeof payload.cells === "object") {
    return Object.keys(payload.cells).length;
  }

  const comparisonsByCriterion = payload?.comparisonsByCriterion;
  if (comparisonsByCriterion && typeof comparisonsByCriterion === "object") {
    return Object.values(comparisonsByCriterion).reduce(
      (total, criterionComparisons) =>
        total +
        (criterionComparisons && typeof criterionComparisons === "object"
          ? Object.keys(criterionComparisons).length
          : 0),
      0
    );
  }

  return 0;
};

const countFilledPayloadCells = (payload = {}) => {
  if (payload?.cells && typeof payload.cells === "object") {
    return Object.values(payload.cells).filter((cell) =>
      isFilledValue(cell?.value)
    ).length;
  }

  const comparisonsByCriterion = payload?.comparisonsByCriterion;
  if (comparisonsByCriterion && typeof comparisonsByCriterion === "object") {
    return Object.values(comparisonsByCriterion).reduce(
      (total, criterionComparisons) => {
        if (!criterionComparisons || typeof criterionComparisons !== "object") {
          return total;
        }

        return (
          total +
          Object.values(criterionComparisons).filter((cell) =>
            isFilledValue(cell?.value)
          ).length
        );
      },
      0
    );
  }

  return 0;
};

const buildIssueEvaluationStatsByExpert = (evaluationDocs = []) => {
  const statsByExpert = new Map();

  for (const evaluationDoc of evaluationDocs) {
    const expertId = toIdString(evaluationDoc.expert);
    const previous = statsByExpert.get(expertId) || {
      totalDocs: 0,
      filledDocs: 0,
      lastEvaluationAt: null,
    };

    const payload = evaluationDoc.payload || {};
    const submittedAt = evaluationDoc.submittedAt || null;

    previous.totalDocs += countPayloadCells(payload);
    previous.filledDocs += countFilledPayloadCells(payload);

    if (
      submittedAt &&
      (!previous.lastEvaluationAt ||
        new Date(submittedAt) > new Date(previous.lastEvaluationAt))
    ) {
      previous.lastEvaluationAt = submittedAt;
    }

    statsByExpert.set(expertId, previous);
  }

  return statsByExpert;
};

const buildIssueEvaluationStatsByIssue = (evaluationDocs = []) => {
  const statsByIssue = new Map();

  for (const evaluationDoc of evaluationDocs) {
    const issueId = toIdString(evaluationDoc.issue);

    const previous = statsByIssue.get(issueId) || {
      filledCells: 0,
      lastEvaluationAt: null,
    };

    previous.filledCells += countFilledPayloadCells(
      evaluationDoc.payload || {}
    );

    const submittedAt = evaluationDoc.submittedAt || null;

    if (
      submittedAt &&
      (!previous.lastEvaluationAt ||
        new Date(submittedAt) > new Date(previous.lastEvaluationAt))
    ) {
      previous.lastEvaluationAt = submittedAt;
    }

    statsByIssue.set(issueId, previous);
  }

  return statsByIssue;
};

const orderObjectByKeys = (obj, orderedKeys) => {
  const orderedObject = {};
  const usedKeys = new Set();

  for (const key of orderedKeys) {
    orderedObject[key] = Object.prototype.hasOwnProperty.call(obj, key)
      ? obj[key]
      : null;
    usedKeys.add(key);
  }

  for (const [key, value] of Object.entries(obj)) {
    if (!usedKeys.has(key)) {
      orderedObject[key] = value;
    }
  }

  return orderedObject;
};

const formatIssueSnapshotDomain = (domain) => {
  if (!domain) return null;

  return {
    id: toIdString(domain._id),
    name: domain.name,
    type: domain.type,
    ...(domain.type === "numeric" && {
      range: {
        min: domain.numericRange?.min ?? null,
        max: domain.numericRange?.max ?? null,
      },
    }),
    ...(domain.type === "linguistic" && {
      labels: domain.linguisticLabels,
    }),
  };
};

const buildAdminExpertParticipationPayload = (participation) => {
  if (!participation) {
    return null;
  }

  return {
    invitationStatus: participation.invitationStatus,
    weightsCompleted: participation.weightsCompleted,
    evaluationCompleted: participation.evaluationCompleted,
    joinedAt: participation.joinedAt,
    entryPhase: participation.entryPhase,
    entryStage: participation.entryStage,
  };
};

const buildAdminExpertIdentityPayload = (expert, fallbackId) =>
  buildParticipantExpertPayload(expert, fallbackId);

const buildPairKey = (alternativeA, alternativeB) =>
  `${alternativeA}::${alternativeB}`;

const buildCollectiveValueCell = (value) => ({
  value:
    value !== null && typeof value === "object" && !Array.isArray(value)
      ? value.value
      : value,
  expressionDomain: null,
});

const buildNeutralCollectiveCell = () => ({
  value: "Neutral",
  expressionDomain: null,
  isNeutralFallback: true,
});

const buildCollectivePairwiseRowsFromPairMap = ({
  criterionPairs,
  orderedAlternatives,
}) => {
  if (!isPlainObject(criterionPairs)) {
    return null;
  }

  return orderedAlternatives.map((rowAlternative) => {
    const row = { id: rowAlternative };

    for (const colAlternative of orderedAlternatives) {
      if (rowAlternative === colAlternative) {
        row[colAlternative] = buildNeutralCollectiveCell();
        continue;
      }

      row[colAlternative] = buildCollectiveValueCell(
        criterionPairs[buildPairKey(rowAlternative, colAlternative)]
      );
    }

    return row;
  });
};

const buildCollectivePairwiseRowsFromMatrix = ({
  criterionMatrix,
  orderedAlternatives,
}) => {
  if (!Array.isArray(criterionMatrix)) {
    return null;
  }

  return orderedAlternatives.map((rowAlternative, rowIndex) => {
    const row = { id: rowAlternative };
    const sourceRow = Array.isArray(criterionMatrix[rowIndex])
      ? criterionMatrix[rowIndex]
      : [];

    for (const [colIndex, colAlternative] of orderedAlternatives.entries()) {
      if (rowAlternative === colAlternative) {
        row[colAlternative] = buildNeutralCollectiveCell();
        continue;
      }

      row[colAlternative] = buildCollectiveValueCell(sourceRow[colIndex]);
    }

    return row;
  });
};

const buildCollectivePairwiseRowsFromRows = ({
  criterionRows,
  orderedAlternatives,
}) => {
  if (!Array.isArray(criterionRows)) {
    return null;
  }

  const rowMap = new Map(
    criterionRows
      .filter((row) => isPlainObject(row) && typeof row.id === "string")
      .map((row) => [row.id, row])
  );

  if (rowMap.size === 0) {
    return null;
  }

  return orderedAlternatives.map((rowAlternative) => {
    const row = { id: rowAlternative };
    const sourceRow = rowMap.get(rowAlternative) || {};

    for (const colAlternative of orderedAlternatives) {
      if (rowAlternative === colAlternative) {
        row[colAlternative] = buildNeutralCollectiveCell();
        continue;
      }

      row[colAlternative] = buildCollectiveValueCell(sourceRow[colAlternative]);
    }

    return row;
  });
};

const normalizeAdminPairwiseCollectiveEvaluations = ({
  source,
  orderedAlternatives,
  orderedLeafCriteria,
}) => {
  if (!isPlainObject(source)) {
    return null;
  }

  const normalized = {};

  for (const criterion of orderedLeafCriteria) {
    const criterionName = criterion?.name;
    if (!criterionName) {
      continue;
    }

    const criterionSource = source[criterionName];
    let rows = null;

    if (Array.isArray(criterionSource)) {
      rows =
        criterionSource.length > 0 &&
          isPlainObject(criterionSource[0]) &&
          "id" in criterionSource[0]
          ? buildCollectivePairwiseRowsFromRows({
            criterionRows: criterionSource,
            orderedAlternatives,
          })
          : buildCollectivePairwiseRowsFromMatrix({
            criterionMatrix: criterionSource,
            orderedAlternatives,
          });
    } else if (isPlainObject(criterionSource)) {
      rows = buildCollectivePairwiseRowsFromPairMap({
        criterionPairs: criterionSource,
        orderedAlternatives,
      });
    }

    if (rows) {
      normalized[criterionName] = rows;
    }
  }

  return Object.keys(normalized).length > 0 ? normalized : null;
};

export const getIssueExpertEvaluationsPayload = async ({
  issueId,
  expertId,
}) => {
  if (!issueId || !isValidObjectIdLike(issueId)) {
    throw createBadRequestError("Valid issue id is required", {
      field: "issueId",
    });
  }

  if (!expertId || !isValidObjectIdLike(expertId)) {
    throw createBadRequestError("Valid expert id is required", {
      field: "expertId",
    });
  }

  let issue = await Issue.findById(issueId)
    .populate(
      "model",
      "name alternativeEvaluationStructureKey criteriaWeightingStructureKey supportsConsensus supportsConsensusSimulation"
    )
    .lean();

  if (!issue) {
    throw createNotFoundError("Issue not found", {
      field: "issueId",
    });
  }

  const orderedIssue = await ensureIssueOrdersDb({ issueId });

  issue = {
    ...issue,
    alternativeOrder: orderedIssue.alternativeOrder,
    leafCriteriaOrder: orderedIssue.leafCriteriaOrder,
  };

  const [
    expert,
    participation,
    latestAlternativeStageResult,
    orderedAlternatives,
    orderedLeafCriteria,
    evaluationDoc,
  ] = await Promise.all([
    User.findById(expertId)
      .select("name email role university accountConfirm")
      .lean(),
    Participation.findOne({ issue: issueId, expert: expertId }).lean(),
    IssueStageResult.findOne({
      issue: issueId,
      stage: "alternativeEvaluation",
    })
      .sort({ consensusPhase: -1 })
      .lean(),
    getOrderedAlternativesDb({
      issueId,
      issueDoc: issue,
      select: "_id name",
      lean: true,
    }),
    getOrderedLeafCriteriaDb({
      issueId,
      issueDoc: issue,
      select: "_id name type",
      lean: true,
    }),
    IssueEvaluation.findOne({
      issue: issueId,
      expert: expertId,
      stage: "alternativeEvaluation",
    })
      .sort({ consensusPhase: -1 })
      .lean(),
  ]);

  if (!participation && !expert && !evaluationDoc) {
    throw createNotFoundError("Expert data for this issue not found", {
      field: "expertId",
    });
  }

  const alternativeEvaluationStructureKey = issue.alternativeEvaluationStructureKey;
  const evaluationPayload = evaluationDoc?.payload || {};
  const lastEvaluationAt = evaluationDoc?.submittedAt || null;
  const consensusPhase = evaluationDoc?.consensusPhase ?? null;
  const collectiveSource =
    latestAlternativeStageResult?.collectiveEvaluations || null;

  const usesPairwiseAlternatives =
    alternativeEvaluationStructureKey ===
    "alternativePairwiseByCriterion";

  if (usesPairwiseAlternatives) {
    const comparisonsByCriterion =
      evaluationPayload.comparisonsByCriterion || {};

    const evaluations = {};
    const orderedAlternativeNames = orderedAlternatives.map(
      (alternative) => alternative.name
    );

    let filledCells = 0;
    const normalizedPairwiseCollectiveEvaluations =
      normalizeAdminPairwiseCollectiveEvaluations({
        source: collectiveSource,
        orderedAlternatives: orderedAlternativeNames,
        orderedLeafCriteria,
      });

    for (const criterion of orderedLeafCriteria) {
      const criterionComparisons =
        comparisonsByCriterion?.[criterion.name] || {};

      evaluations[criterion.name] = orderedAlternatives.map((alternative) => {
        const row = {
          id: alternative.name,
        };

        for (const comparedAlternative of orderedAlternatives) {
          if (alternative.name === comparedAlternative.name) {
            continue;
          }

          const pairKey = `${alternative.name}::${comparedAlternative.name}`;
          const cell = criterionComparisons?.[pairKey];

          row[comparedAlternative.name] = {
            value: cell?.value,
            domain: formatIssueSnapshotDomain(cell?.expressionDomain),
            timestamp: lastEvaluationAt,
            consensusPhase,
          };

          if (isFilledValue(cell?.value)) {
            filledCells += 1;
          }
        }

        return orderObjectByKeys(row, ["id", ...orderedAlternativeNames]);
      });
    }

    return {
      issue: {
        id: toIdString(issue._id),
        name: issue.name,
        currentStage: issue.currentStage,
        weightingMode: issue.weightingMode,
        active: issue.active,
        alternativeEvaluationStructureKey: issue.alternativeEvaluationStructureKey,
        criteriaWeightingStructureKey: issue.criteriaWeightingStructureKey,
      },
      expert: buildAdminExpertIdentityPayload(expert, expertId),
      participation: buildAdminExpertParticipationPayload(participation),
      stats: {
        expectedCells: countExpectedEvaluationCellsPerExpert({
          alternativesCount: orderedAlternatives.length,
          leafCriteriaCount: orderedLeafCriteria.length,
          alternativeEvaluationStructureKey:
            "alternativePairwiseByCriterion",
        }),
        filledCells,
        lastEvaluationAt,
      },
      evaluations,
      collectiveEvaluations: normalizedPairwiseCollectiveEvaluations,
    };
  }

  const cells = evaluationPayload.cells || {};
  const evaluations = {};
  let filledCells = 0;

  for (const alternative of orderedAlternatives) {
    evaluations[alternative.name] = {};

    for (const criterion of orderedLeafCriteria) {
      const cellKey = `${alternative.name}::${criterion.name}`;
      const cell = cells?.[cellKey];

      evaluations[alternative.name][criterion.name] = {
        value: cell?.value,
        domain: formatIssueSnapshotDomain(cell?.expressionDomain),
        timestamp: lastEvaluationAt,
        consensusPhase,
      };

      if (isFilledValue(cell?.value)) {
        filledCells += 1;
      }
    }
  }

  return {
    issue: {
      id: toIdString(issue._id),
      name: issue.name,
      currentStage: issue.currentStage,
      weightingMode: issue.weightingMode,
      active: issue.active,
      alternativeEvaluationStructureKey: issue.alternativeEvaluationStructureKey,
      criteriaWeightingStructureKey: issue.criteriaWeightingStructureKey,
    },
    expert: buildAdminExpertIdentityPayload(expert, expertId),
    participation: buildAdminExpertParticipationPayload(participation),
    stats: {
      expectedCells: countExpectedEvaluationCellsPerExpert({
        alternativesCount: orderedAlternatives.length,
        leafCriteriaCount: orderedLeafCriteria.length,
        alternativeEvaluationStructureKey,
      }),
      filledCells,
      lastEvaluationAt,
    },
    evaluations,
    collectiveEvaluations: isPlainObject(collectiveSource)
      ? collectiveSource
      : null,
  };
};

export const getIssueExpertWeightsPayload = async ({
  issueId,
  expertId,
}) => {
  if (!issueId || !isValidObjectIdLike(issueId)) {
    throw createBadRequestError("Valid issue id is required", {
      field: "issueId",
    });
  }

  if (!expertId || !isValidObjectIdLike(expertId)) {
    throw createBadRequestError("Valid expert id is required", {
      field: "expertId",
    });
  }

  let issue = await Issue.findById(issueId)
    .populate(
      "model",
      "name alternativeEvaluationStructureKey criteriaWeightingStructureKey supportsConsensus supportsConsensusSimulation"
    )
    .lean();

  if (!issue) {
    throw createNotFoundError("Issue not found", {
      field: "issueId",
    });
  }

  const orderedIssue = await ensureIssueOrdersDb({ issueId });

  issue = {
    ...issue,
    alternativeOrder: orderedIssue.alternativeOrder,
    leafCriteriaOrder: orderedIssue.leafCriteriaOrder,
  };

  const [expert, participation, orderedLeafCriteria, weightDoc] =
    await Promise.all([
      User.findById(expertId)
        .select("name email role university accountConfirm")
        .lean(),
      Participation.findOne({ issue: issueId, expert: expertId }).lean(),
      getOrderedLeafCriteriaDb({
        issueId,
        issueDoc: issue,
        select: "_id name type expressionDomain",
        lean: true,
      }),
      IssueEvaluation.findOne({
        issue: issueId,
        expert: expertId,
        stage: "criteriaWeighting",
      })
        .sort({ consensusPhase: -1 })
        .lean(),
    ]);

  if (!expert && !participation && !weightDoc) {
    throw createNotFoundError("Expert weight data for this issue not found", {
      field: "expertId",
    });
  }

  const leafNames = orderedLeafCriteria.map((criterion) => criterion.name);

  const resolvedWeights =
    Array.isArray(issue?.modelParameters?.weights) &&
    issue.modelParameters.weights.length
      ? leafNames.reduce((accumulator, name, index) => {
        accumulator[name] = issue.modelParameters.weights[index];
        return accumulator;
      }, {})
      : null;

  const manualWeights = weightDoc
    ? orderObjectByKeys(weightDoc.payload?.weightsByCriterion ?? {}, leafNames)
    : null;

  const weightBwmData = weightDoc?.payload || {};
  const bwm = {
    bestCriterion: weightBwmData?.bestCriterion,
    worstCriterion: weightBwmData?.worstCriterion,
    bestToOthers: orderObjectByKeys(weightBwmData?.bestToOthers ?? {}, leafNames),
    othersToWorst: orderObjectByKeys(weightBwmData?.othersToWorst ?? {}, leafNames),
  };

  let kind = "unknown";

  if (leafNames.length === 1) {
    kind = "singleLeaf";
  } else if (
    issue.criteriaWeightingStructureKey ===
    "manualCriteriaWeights"
  ) {
    kind = "manualCriteriaWeights";
  } else if (
    issue.criteriaWeightingStructureKey ===
    "bestWorstCriteria"
  ) {
    kind = "bestWorstCriteria";
  } else if (!issue.criteriaWeightingStructureKey) {
    kind = "notRequired";
  }

  const criteriaWeightsStatus = !issue.criteriaWeightingStructureKey
    ? "notRequired"
    : !weightDoc
      ? "notSubmitted"
      : weightDoc.completed === true
        ? "submitted"
        : "draft";

  const hasManualWeightsByCriterion = isPlainObject(
    weightDoc?.payload?.weightsByCriterion
  );

  return {
    issue: {
      id: toIdString(issue._id),
      name: issue.name,
      currentStage: issue.currentStage,
      weightingMode: issue.weightingMode,
      active: issue.active,
      alternativeEvaluationStructureKey: issue.alternativeEvaluationStructureKey,
      criteriaWeightingStructureKey: issue.criteriaWeightingStructureKey,
      model: issue.model
        ? {
          id: toIdString(issue.model._id),
          name: issue.model.name,
          alternativeEvaluationStructureKey:
            issue.model.alternativeEvaluationStructureKey,
          criteriaWeightingStructureKey:
            issue.model.criteriaWeightingStructureKey,
        }
        : null,
    },
    expert: buildAdminExpertIdentityPayload(expert, expertId),
    participation: buildAdminExpertParticipationPayload(participation),
    weights: {
      kind,
      status: criteriaWeightsStatus,
      structureKey: issue.criteriaWeightingStructureKey || null,
      structureLabel:
        kind === "manualCriteriaWeights"
          ? "Manual weights"
          : kind === "bestWorstCriteria"
            ? "Best-worst weights"
            : kind === "singleLeaf"
              ? "Single criterion weights"
              : kind === "notRequired"
                ? "Not required"
                : "Criteria weights",
      leafCriteria: leafNames,
      leafCriteriaDetailed: orderedLeafCriteria.map((criterion) => ({
        criterionId: toIdString(criterion._id),
        criterionName: criterion.name,
        type: criterion.type || null,
        expressionDomain: formatIssueSnapshotDomain(criterion.expressionDomain),
      })),
      singleLeafAutoWeights:
        leafNames.length === 1
          ? {
            [leafNames[0]]: resolvedWeights?.[leafNames[0]],
          }
          : null,
      resolvedWeights,
      manualWeights: hasManualWeightsByCriterion ? manualWeights : null,
      bwm,
      docMeta: weightDoc
        ? {
          completed: weightDoc.completed,
          consensusPhase: weightDoc.consensusPhase,
          updatedAt: weightDoc.updatedAt,
        }
        : null,
    },
  };
};

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
