import { orderDocsByIdList } from "../issue.ordering.js";
import { sameId, toIdString } from "../../../utils/common/ids.js";
import { createInternalError } from "../../../utils/common/errors.js";

import {
  ACTIVE_ACTION_META,
  ACTIVE_STAGE_META,
  ACTIVE_TASK_ACTION_KEYS,
} from "./activeIssue.meta.js";
import {
  buildIssueCriteriaTree,
  decorateCriteriaTree,
} from "../issue.criteriaTree.js";
import {
  buildDeadlineInfo,
  buildActiveWorkflowSteps,
} from "./activeIssue.workflow.js";

/**
 * Construye la vista de un issue activo y las tareas asociadas para el task center.
 *
 * @param {object} params Parámetros de entrada.
 * @param {Object} params.issue Documento del issue.
 * @param {string} params.userId Id del usuario actual.
 * @param {Set<string>} params.adminIssueIdSet Set de ids de issues donde el usuario es admin.
 * @param {Array<Object>} params.issueParticipations Participaciones del issue.
 * @param {Array<Object>} params.issueAlternativeDocs Alternativas del issue.
 * @param {Array<Object>} params.issueCriteriaDocs Criterios del issue.
 * @param {number} params.savedPhasesCount Número de fases de consenso ya guardadas.
 * @param {Array<Object>} [params.consensusHistoryRounds] Historial de consenso desde colección Consensus.
 * @param {Object} params.dayjsLib Instancia de dayjs.
 * @returns {Object}
 */
export const buildActiveIssueView = ({
  issue,
  userId,
  adminIssueIdSet,
  issueParticipations,
  issueAlternativeDocs,
  issueCriteriaDocs,
  savedPhasesCount,
  consensusHistoryRounds,
  dayjsLib,
}) => {
  const issueId = toIdString(issue._id);
  const adminId = toIdString(issue.admin);
  const isAdminUser = adminId === userId || adminIssueIdSet.has(issueId);

  const acceptedParticipations = issueParticipations.filter(
    (participation) => participation.invitationStatus === "accepted"
  );
  const pendingParticipations = issueParticipations.filter(
    (participation) => participation.invitationStatus === "pending"
  );
  const declinedParticipations = issueParticipations.filter(
    (participation) => participation.invitationStatus === "declined"
  );

  const hasPending = pendingParticipations.length > 0;

  const totalAccepted = acceptedParticipations.length;
  const completedWeightEvaluations = acceptedParticipations.filter(
    (participation) => participation.weightsCompleted
  ).length;
  const completedAlternativeEvaluations = acceptedParticipations.filter(
    (participation) => participation.evaluationCompleted
  ).length;

  const isExpertAccepted = acceptedParticipations.some((participation) =>
    sameId(participation.expert._id, userId)
  );

  const myParticipation = issueParticipations.find((participation) =>
    sameId(participation.expert._id, userId)
  );

  const orderedAlternativeDocs = orderDocsByIdList(
    issueAlternativeDocs,
    issue.alternativeOrder
  );
  const alternativeNames = orderedAlternativeDocs.map(
    (alternative) => alternative.name
  );

  const { criteriaTree, orderedLeafCriteria } = buildIssueCriteriaTree(
    issueCriteriaDocs,
    issue
  );

  const criteriaWeights = issue.modelParameters.weights;

  const criteriaWeightsById = orderedLeafCriteria.reduce((acc, node, index) => {
    acc[node.id] = criteriaWeights[index];
    return acc;
  }, {});

  const criteriaWeightsByName = orderedLeafCriteria.reduce((acc, node, index) => {
    acc[node.name] = criteriaWeights[index];
    return acc;
  }, {});

  decorateCriteriaTree(criteriaTree, criteriaWeightsById);

  const consensusCurrentPhase = savedPhasesCount + 1;

  const deadline = buildDeadlineInfo(issue.closureDate, dayjsLib);
  const stage = issue.currentStage;
  const stageMeta = ACTIVE_STAGE_META[stage];

  if (!stageMeta) {
    throw createInternalError("Unsupported active issue stage", {
      field: "currentStage",
      details: {
        issueId,
        stage,
      },
    });
  }

  const allWeightsDone =
    totalAccepted > 0 && completedWeightEvaluations === totalAccepted;

  const allEvalsDone =
    totalAccepted > 0 && completedAlternativeEvaluations === totalAccepted;

  const waitingAdmin =
    !isAdminUser &&
    !hasPending &&
    ((stage === "weightsFinished" && allWeightsDone) ||
      (stage === "alternativeEvaluation" && allEvalsDone));

  const canComputeWeights =
    stage === "weightsFinished" &&
    isAdminUser &&
    !hasPending &&
    totalAccepted > 0 &&
    allWeightsDone;

  const canResolveIssue =
    stage === "alternativeEvaluation" &&
    isAdminUser &&
    !hasPending &&
    totalAccepted > 0 &&
    allEvalsDone;

  const canEvaluateWeights =
    stage === "criteriaWeighting" &&
    isExpertAccepted &&
    acceptedParticipations.some(
      (participation) =>
        sameId(participation.expert._id, userId) &&
        !participation.weightsCompleted
    );

  const canEvaluateAlternatives =
    stage === "alternativeEvaluation" &&
    isExpertAccepted &&
    acceptedParticipations.some(
      (participation) =>
        sameId(participation.expert._id, userId) &&
        !participation.evaluationCompleted
    );

  const waitingExperts =
    (hasPending && stage !== "finished") ||
    (!waitingAdmin &&
      !canResolveIssue &&
      !canComputeWeights &&
      !canEvaluateWeights &&
      !canEvaluateAlternatives &&
      stage !== "finished");

  const statusFlags = {
    canEvaluateWeights,
    canComputeWeights,
    canEvaluateAlternatives,
    canResolveIssue,
    waitingAdmin,
    waitingExperts,
  };

  const actions = [];
  if (canResolveIssue) actions.push(ACTIVE_ACTION_META.resolveIssue);
  if (canComputeWeights) actions.push(ACTIVE_ACTION_META.computeWeights);
  if (canEvaluateWeights) actions.push(ACTIVE_ACTION_META.evaluateWeights);
  if (canEvaluateAlternatives) {
    actions.push(ACTIVE_ACTION_META.evaluateAlternatives);
  }

  actions.sort((a, b) => a.sortPriority - b.sortPriority);

  const nextAction = actions[0] ?? null;

  let statusLabel = stageMeta.label;
  let statusKey = stage;

  if (stage !== "finished") {
    if (waitingAdmin) {
      statusLabel = "Waiting for admin";
      statusKey = "waitingAdmin";
    } else if (nextAction) {
      statusLabel = nextAction.label;
      statusKey = nextAction.key;
    } else {
      statusLabel = "Waiting experts";
      statusKey = "waitingExperts";
    }
  }

  const taskItems = actions
    .filter((action) => ACTIVE_TASK_ACTION_KEYS.includes(action.key))
    .filter((action) => !(action.role === "admin" && !isAdminUser))
    .filter((action) => !(action.role === "expert" && !isExpertAccepted))
    .map((action) => ({
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

  const isWeightEvaluationStage =
    stage === "criteriaWeighting" || stage === "weightsFinished";

  let completedParticipations;
  let pendingEvaluationParticipations;

  if (isWeightEvaluationStage) {
    completedParticipations = acceptedParticipations.filter(
      (participation) => participation.weightsCompleted
    );
    pendingEvaluationParticipations = acceptedParticipations.filter(
      (participation) => !participation.weightsCompleted
    );
  } else {
    completedParticipations = acceptedParticipations.filter(
      (participation) => participation.evaluationCompleted
    );
    pendingEvaluationParticipations = acceptedParticipations.filter(
      (participation) => !participation.evaluationCompleted
    );
  }

  const evaluated = completedParticipations.some((participation) =>
    sameId(participation.expert._id, userId)
  );

  let role = "viewer";
  if (isAdminUser && isExpertAccepted) {
    role = "both";
  } else if (isAdminUser) {
    role = "admin";
  } else if (isExpertAccepted) {
    role = "expert";
  }

  const workflowSteps = buildActiveWorkflowSteps({
    usesManualWeighting: issue.weightingMode === "manual",
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
      evaluationStructure: issue.evaluationStructure,
      isConsensus: issue.isConsensus,
      currentStage: stage,
      weightingMode: issue.weightingMode,
      ...(issue.isConsensus && {
        consensusMaxPhases: issue.consensusMaxPhases || "Unlimited",
        consensusThreshold: issue.consensusThreshold,
        consensusCurrentPhase,
      }),
      creationDate: issue.creationDate,
      createdAt: issue.createdAt,
      closureDate: issue.closureDate,
      isAdmin: isAdminUser,
      isExpert: isExpertAccepted,
      role,
      alternatives: alternativeNames,
      criteria: criteriaTree,
      evaluated,
      totalExperts:
        totalAccepted +
        pendingParticipations.length +
        declinedParticipations.length,
      participatedExperts: completedParticipations
        .map((participation) => participation.expert.email)
        .sort(),
      pendingExperts: pendingParticipations
        .map((participation) => participation.expert.email)
        .sort(),
      notAcceptedExperts: declinedParticipations
        .map((participation) => participation.expert.email)
        .sort(),
      acceptedButNotEvaluatedExperts: pendingEvaluationParticipations
        .map((participation) => participation.expert.email)
        .sort(),
      statusFlags,
      progress: {
        weightsDone: completedWeightEvaluations,
        evalsDone: completedAlternativeEvaluations,
        totalAccepted,
      },
      finalWeights: criteriaWeightsByName,
      consensusHistory: consensusHistoryRounds,
      consensusRounds: consensusHistoryRounds,
      modelParameters: issue.modelParameters,
      myParticipation: myParticipation
        ? {
          invitationStatus: myParticipation.invitationStatus,
          weightsCompleted: myParticipation.weightsCompleted,
          evaluationCompleted: myParticipation.evaluationCompleted,
          joinedAt: myParticipation.joinedAt,
        }
        : null,
      actions,
      nextAction,
      ui: {
        stage,
        stageLabel: stageMeta.label,
        stageColorKey: stageMeta.colorKey,
        statusKey,
        statusLabel,
        deadline,
        hasDirectWeights: issue.weightingMode === "manual",
        hasAlternativeConsensus: issue.isConsensus,
        workflowSteps,
        permissions: {
          evaluateWeights: canEvaluateWeights,
          evaluateAlternatives: canEvaluateAlternatives,
          computeWeights: canComputeWeights,
          resolveIssue: canResolveIssue,
          waitingAdmin,
          waitingExperts: statusKey === "waitingExperts",
        },
        modelParameters: issue.modelParameters,
      },
    },
  };
};
