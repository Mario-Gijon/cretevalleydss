import { orderDocsByIdList } from "../shared/ordering.js";
import { toIdString } from "../../../utils/common/ids.js";
import { createInternalError } from "../../../utils/common/errors.js";
import { decorateCriteriaTree } from "../shared/criteriaTree.js";
import { ACTIVE_STAGE_META, ACTIVE_STATUS_KEYS } from "./activeIssueUiCatalog.js";
import { buildDeadlineInfo } from "./buildActiveDeadlineInfo.js";
import { buildActiveWorkflowSteps } from "./buildActiveWorkflowSteps.js";
import { ISSUE_STAGES } from "../../decisionEngine/evaluations/evaluation.constants.js";
import {
  buildActiveParticipationSummary,
} from "./buildActiveParticipationSummary.js";
import { resolveActiveIssuePermissions } from "./resolveActiveIssuePermissions.js";
import {
  buildActiveCriteriaView,
} from "./buildActiveCriteriaView.js";
import { buildActiveCriteriaWeights } from "./buildActiveCriteriaWeights.js";

const ALTERNATIVE_CONSENSUS_UI_STAGE = "alternativeConsensus";

export const buildActiveIssueView = ({
  issue,
  userId,
  adminIssueIdSet,
  issueParticipations,
  issueAlternativeDocs,
  issueCriteriaDocs,
  consensusHistoryRounds,
}) => {
  const issueId = toIdString(issue._id);
  const adminId = toIdString(issue.admin);
  const isAdminUser = adminId === userId || adminIssueIdSet.has(issueId);
  const stage = issue.currentStage;
  const consensusCurrentPhase = issue.consensusPhase;
  const deadline = buildDeadlineInfo(issue.closureDate);

  const orderedAlternativeDocs = orderDocsByIdList(
    issueAlternativeDocs,
    issue.alternativeOrder
  );
  const alternativeNames = orderedAlternativeDocs.map(
    (alternative) => alternative.name
  );

  const participationSummary = buildActiveParticipationSummary({
    issueParticipations,
    userId,
    isAdminUser,
    stage,
  });

  const { criteriaTree, orderedLeafCriteria, expressionDomainConfig } =
    buildActiveCriteriaView({
      issue,
      issueCriteriaDocs,
    });

  const { criteriaWeightsById, criteriaWeightsByName } =
    buildActiveCriteriaWeights({
      issue,
      orderedLeafCriteria,
      issueId,
    });

  decorateCriteriaTree(criteriaTree, criteriaWeightsById);

  const uiStage =
    stage === ISSUE_STAGES.ALTERNATIVE_EVALUATION &&
    issue.isConsensus &&
    issue.consensusPhase > 1
      ? ALTERNATIVE_CONSENSUS_UI_STAGE
      : stage;

  const stageMeta = ACTIVE_STAGE_META[uiStage];

  if (!stageMeta) {
    throw createInternalError("Unsupported active issue stage", {
      field: "currentStage",
      details: {
        issueId,
        stage,
      },
    });
  }

  const permissions = resolveActiveIssuePermissions({
    stage,
    stageMeta,
    isAdminUser,
    hasPending: participationSummary.hasPending,
    totalAccepted: participationSummary.totalAccepted,
    completedWeightEvaluations: participationSummary.completedWeightEvaluations,
    completedAlternativeEvaluations:
      participationSummary.completedAlternativeEvaluations,
    acceptedUserParticipation: participationSummary.acceptedUserParticipation,
  });

  const taskItems = permissions.actions.map((action) => ({
    issueId,
    issueName: issue.name,
    stage,
    role: action.role,
    severity: action.severity,
    actionKey: action.key,
    actionLabel: action.label,
    sortPriority: action.sortPriority,
    deadline,
  }));

  const workflowSteps = buildActiveWorkflowSteps({
    hasAlternativeConsensus: issue.isConsensus,
  });

  return {
    taskItems,
    issueView: {
      id: issueId,
      name: issue.name,
      creator: issue.admin.email,
      description: issue.description,
      model: issue.model,
      criteriaWeightingStructureKey: issue.criteriaWeightingStructureKey,
      alternativeEvaluationStructureKey: issue.alternativeEvaluationStructureKey,
      isConsensus: issue.isConsensus,
      supportsConsensus: issue.supportsConsensus,
      simulateConsensus: issue.simulateConsensus,
      supportsConsensusSimulation: issue.model.supportsConsensusSimulation,
      currentStage: stage,
      ...(issue.isConsensus && {
        consensusMaxPhases: issue.consensusMaxPhases,
        consensusThreshold: issue.consensusThreshold,
        consensusCurrentPhase,
      }),
      creationDate: issue.creationDate,
      createdAt: issue.createdAt,
      closureDate: issue.closureDate,
      isAdmin: isAdminUser,
      isExpert: participationSummary.isExpertAccepted,
      role: participationSummary.role,
      alternatives: alternativeNames,
      criteria: criteriaTree,
      evaluated: participationSummary.evaluated,
      totalExperts: participationSummary.totalExperts,
      participatedExperts: participationSummary.participatedExperts,
      pendingExperts: participationSummary.pendingExperts,
      notAcceptedExperts: participationSummary.notAcceptedExperts,
      acceptedButNotEvaluatedExperts:
        participationSummary.acceptedButNotEvaluatedExperts,
      statusFlags: permissions.statusFlags,
      progress: {
        weightsDone: participationSummary.completedWeightEvaluations,
        evalsDone: participationSummary.completedAlternativeEvaluations,
        totalAccepted: participationSummary.totalAccepted,
      },
      finalWeights: criteriaWeightsByName,
      consensusHistory: consensusHistoryRounds,
      consensusRounds: consensusHistoryRounds,
      modelParameters: issue.modelParameters,
      expressionDomainConfig,
      myParticipation: participationSummary.myParticipation
        ? {
            invitationStatus:
              participationSummary.myParticipation.invitationStatus,
            weightsCompleted:
              participationSummary.myParticipation.weightsCompleted,
            evaluationCompleted:
              participationSummary.myParticipation.evaluationCompleted,
            joinedAt: participationSummary.myParticipation.joinedAt,
          }
        : null,
      actions: permissions.actions,
      nextAction: permissions.nextAction,
      ui: {
        stage: uiStage,
        stageLabel: stageMeta.label,
        stageColorKey: stageMeta.colorKey,
        statusKey: permissions.statusKey,
        statusLabel: permissions.statusLabel,
        deadline,
        criteriaWeightingStructureKey: issue.criteriaWeightingStructureKey,
        alternativeEvaluationStructureKey: issue.alternativeEvaluationStructureKey,
        hasCriteriaWeighting:
          stage === ISSUE_STAGES.CRITERIA_WEIGHTING ||
          stage === ISSUE_STAGES.WEIGHTS_FINISHED,
        hasAlternativeConsensus: issue.isConsensus,
        workflowSteps,
        permissions: {
          evaluateWeights: permissions.canEvaluateWeights,
          evaluateAlternatives: permissions.canEvaluateAlternatives,
          computeWeights: permissions.canComputeWeights,
          resolveIssue: permissions.canResolveIssue,
          waitingAdmin: permissions.waitingAdmin,
          waitingExperts:
            permissions.statusKey === ACTIVE_STATUS_KEYS.WAITING_EXPERTS,
        },
        modelParameters: issue.modelParameters,
      },
    },
  };
};
