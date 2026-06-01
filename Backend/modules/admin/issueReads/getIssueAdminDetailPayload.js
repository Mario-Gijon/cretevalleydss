import { Consensus } from "../../../models/Consensus.js";
import { Criterion } from "../../../models/Criteria.js";
import { ExitUserIssue } from "../../../models/ExitUserIssue.js";
import { IssueEvaluation } from "../../../models/IssueEvaluations.js";
import { IssueExpressionDomain } from "../../../models/IssueExpressionDomains.js";
import { IssueScenario } from "../../../models/IssueScenarios.js";
import { Participation } from "../../../models/Participations.js";

import {
  getOrderedAlternativesDb,
  getOrderedLeafCriteriaDb,
} from "../../issues/shared/ordering.js";
import { buildExpressionDomainConfigFromLeafCriteriaOrThrow } from "../../expressionDomains/buildIssueDomainConfig.js";

import { toIdString } from "../../../utils/common/ids.js";
import {
  buildCriteriaTreeAdmin,
  buildParticipantExpertPayload,
  formatIssueSnapshotDomain,
  getCreatorActionFlags,
  getIssueStageMeta,
} from "./adminIssueReadPayloads.js";
import {
  buildIssueEvaluationStatsByExpert,
  countExpectedEvaluationCellsPerExpert,
} from "./adminIssueProgress.js";
import { loadIssueForAdminDetailOrThrow } from "./adminIssueReadLoaders.js";

export const getIssueAdminDetailPayload = async ({ issueId }) => {
  const issue = await loadIssueForAdminDetailOrThrow({ issueId });

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
