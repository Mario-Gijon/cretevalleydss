import { Criterion } from "../../../models/Criteria.js";
import { ExitUserIssue } from "../../../models/ExitUserIssue.js";
import { IssueEvaluation } from "../../../models/IssueEvaluations.js";
import { IssueExpressionDomain } from "../../../models/IssueExpressionDomains.js";
import { IssueScenario } from "../../../models/IssueScenarios.js";
import { IssueStageResult } from "../../../models/IssueStageResults.js";
import { Participation } from "../../../models/Participations.js";

import {
  getOrderedAlternativesDb,
  getOrderedLeafCriteriaDb,
} from "../../issues/shared/ordering.js";
import { EVALUATION_STAGES } from "../../decisionEngine/evaluations/evaluation.constants.js";
import { buildExpressionDomainConfigFromLeafCriteriaOrThrow } from "../../expressionDomains/buildIssueDomainConfig.js";

import { createInternalError } from "../../../utils/common/errors.js";
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
  resolveExpectedEvaluationCellsPerExpert,
} from "./adminIssueProgress.js";
import { loadIssueForAdminDetailOrThrow } from "./adminIssueReadLoaders.js";

const buildAdminFinalWeightsMaps = ({ issue, orderedLeafCriteria }) => {
  const rawWeights = issue?.modelParameters?.weights;

  if (rawWeights === undefined) {
    return {
      finalWeightsById: {},
      finalWeightsByName: {},
    };
  }

  if (!Array.isArray(rawWeights)) {
    throw createInternalError("Issue modelParameters.weights must be an array when present", {
      field: "modelParameters.weights",
      details: {
        issueId: toIdString(issue?._id),
      },
    });
  }

  if (rawWeights.length !== orderedLeafCriteria.length) {
    throw createInternalError("Issue modelParameters.weights length does not match ordered leaf criteria", {
      field: "modelParameters.weights",
      details: {
        issueId: toIdString(issue?._id),
        expectedCount: orderedLeafCriteria.length,
        receivedCount: rawWeights.length,
      },
    });
  }

  const finalWeightsById = {};
  const finalWeightsByName = {};

  orderedLeafCriteria.forEach((criterion, index) => {
    const value = rawWeights[index];
    finalWeightsById[toIdString(criterion._id)] = value;
    finalWeightsByName[criterion.name] = value;
  });

  return {
    finalWeightsById,
    finalWeightsByName,
  };
};

export const getIssueAdminDetailPayload = async ({ issueId }) => {
  const issue = await loadIssueForAdminDetailOrThrow({ issueId });

  const [
    orderedAlternatives,
    orderedLeafCriteria,
    allCriteria,
    participations,
    exits,
    alternativeStageResults,
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
    IssueStageResult.find({
      issue: issueId,
      stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
    })
      .sort({ consensusPhase: 1 })
      .lean(),
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
      .select("expert completed submittedAt updatedAt")
      .lean(),
    IssueEvaluation.find({
      issue: issueId,
      stage: "criteriaWeighting",
    })
      .select("expert completed submittedAt updatedAt")
      .lean(),
  ]);

  const alternativesCount = orderedAlternatives.length;
  const leafCriteriaCount = orderedLeafCriteria.length;

  const expectedPerExpert = await resolveExpectedEvaluationCellsPerExpert();

  const criteriaTree = buildCriteriaTreeAdmin(allCriteria);
  const { finalWeightsById, finalWeightsByName } = buildAdminFinalWeightsMaps({
    issue,
    orderedLeafCriteria,
  });

  const evaluationAggMap = await buildIssueEvaluationStatsByExpert({
    evaluationDocs,
  });

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
      submittedDocs: 0,
      draftDocs: 0,
      lastEvaluationAt: null,
      latestStatus: "notSubmitted",
      latestCompleted: false,
      latestSubmittedAt: null,
      latestUpdatedAt: null,
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
        status: evaluationStats.latestStatus,
        completed: evaluationStats.latestCompleted === true,
        expectedEvaluationCells: expectedPerExpert,
        totalEvaluationDocs: evaluationStats.totalDocs,
        submittedEvaluationDocs: evaluationStats.submittedDocs || 0,
        draftEvaluationDocs: evaluationStats.draftDocs || 0,
        filledEvaluationDocs:
          evaluationStats.latestCompleted === true ? 1 : 0,
        evaluationProgressPct:
          evaluationStats.latestCompleted === true ? 100 : 0,
        lastEvaluationAt: evaluationStats.lastEvaluationAt,
        submittedAt: evaluationStats.latestSubmittedAt || null,
        updatedAt: evaluationStats.latestUpdatedAt || null,
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

  const latestAlternativeStageResult = alternativeStageResults.length
    ? alternativeStageResults[alternativeStageResults.length - 1]
    : null;

  const snapshotsSummary = {
    total: snapshots.length,
    numeric: snapshots.filter((domain) => domain.type === "numeric").length,
    linguistic: snapshots.filter((domain) => domain.type === "linguistic")
      .length,
  };

  const totalSubmittedEvaluationDocs = Array.from(
    evaluationAggMap.values()
  ).reduce((accumulator, row) => accumulator + (row.submittedDocs || 0), 0);
  const totalDraftEvaluationDocs = Array.from(
    evaluationAggMap.values()
  ).reduce((accumulator, row) => accumulator + (row.draftDocs || 0), 0);
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
          alternativeEvaluationStructureKey:
            issue.model.alternativeEvaluationStructureKey,
          criteriaWeightingStructureKey:
            issue.model.criteriaWeightingStructureKey,
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
        rounds: alternativeStageResults.length,
        latestPhase: latestAlternativeStageResult?.consensusPhase ?? null,
        latestConsensusMeasure:
          latestAlternativeStageResult?.consensusMeasure ?? null,
        latestAt:
          latestAlternativeStageResult?.updatedAt ||
          latestAlternativeStageResult?.createdAt ||
          null,
        roundsDetail: alternativeStageResults.map((stageResult) => ({
          phase: stageResult.consensusPhase,
          consensusMeasure: stageResult.consensusMeasure ?? null,
          computedAt: stageResult.updatedAt || stageResult.createdAt || null,
        })),
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
        totalFilledEvaluationCells: totalSubmittedEvaluationDocs,
        totalSubmittedEvaluationDocs,
        totalDraftEvaluationDocs,
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
