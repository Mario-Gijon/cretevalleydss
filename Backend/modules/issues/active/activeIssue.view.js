import { orderDocsByIdList } from "../issue.ordering.js";
import { sameId, toIdString } from "../../../utils/common/ids.js";

import {
  ACTIVE_ACTION_META,
  ACTIVE_STAGE_META,
  ACTIVE_TASK_ACTION_KEYS,
} from "./activeIssue.meta.js";
import {
  buildIssueCriteriaTree,
  decorateCriteriaTree,
} from "./activeIssue.criteria.js";
import {
  buildDeadlineInfo,
  buildWorkflowStepsStable,
  cleanModelParameters,
  detectHasAlternativeConsensusEnabled,
  detectHasDirectWeights,
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
  const evaluationStructure = issue.evaluationStructure;

  const isValidUserId =
    Boolean(userId) &&
    userId !== "undefined" &&
    userId !== "null" &&
    userId !== "[object Object]";

  const adminId = toIdString(issue?.admin);
  const isAdminUser =
    isValidUserId &&
    ((adminId && adminId === userId) || adminIssueIdSet.has(issueId));

  const acceptedExperts = (issueParticipations || []).filter(
    (participation) => participation.invitationStatus === "accepted"
  );
  const pendingExperts = (issueParticipations || []).filter(
    (participation) => participation.invitationStatus === "pending"
  );
  const declinedExperts = (issueParticipations || []).filter(
    (participation) => participation.invitationStatus === "declined"
  );

  const hasPending = pendingExperts.length > 0;
  const realParticipants = acceptedExperts;

  const totalAccepted = acceptedExperts.length;
  const weightsDone = acceptedExperts.filter(
    (participation) => participation.weightsCompleted
  ).length;
  const evalsDone = acceptedExperts.filter(
    (participation) => participation.evaluationCompleted
  ).length;

  const realWeightsDone = realParticipants.filter(
    (participation) => participation.weightsCompleted
  ).length;
  const realEvalsDone = realParticipants.filter(
    (participation) => participation.evaluationCompleted
  ).length;

  const isExpertAccepted = acceptedExperts.some((participation) =>
    sameId(participation.expert?._id, userId)
  );

  const myParticipation =
    (issueParticipations || []).find((participation) =>
      sameId(participation.expert?._id, userId)
    ) || null;

  const orderedAlternativeDocs = orderDocsByIdList(
    issueAlternativeDocs || [],
    issue.alternativeOrder
  );
  const alternativeNames = orderedAlternativeDocs.map(
    (alternative) => alternative.name
  );

  const { criteriaTree, orderedLeafNodes } = buildIssueCriteriaTree(
    issueCriteriaDocs || [],
    issue
  );

  const weightsArray = issue.modelParameters?.weights || [];

  const finalWeightsById = orderedLeafNodes.reduce((acc, node, index) => {
    acc[node.id] = weightsArray[index] ?? null;
    return acc;
  }, {});

  const finalWeightsMap = orderedLeafNodes.reduce((acc, node, index) => {
    acc[node.name] = weightsArray[index] ?? null;
    return acc;
  }, {});

  decorateCriteriaTree(criteriaTree, finalWeightsById);

  const consensusCurrentPhase = (savedPhasesCount || 0) + 1;

  const deadline = buildDeadlineInfo(issue.closureDate, dayjsLib);
  const stage = issue.currentStage;

  const allWeightsDone =
    realParticipants.length > 0 &&
    realWeightsDone === realParticipants.length;

  const allEvalsDone =
    realParticipants.length > 0 &&
    realEvalsDone === realParticipants.length;

  const waitingAdmin =
    !isAdminUser &&
    !hasPending &&
    ((stage === "weightsFinished" && allWeightsDone) ||
      (stage === "alternativeEvaluation" && allEvalsDone));

  const canComputeWeights =
    stage === "weightsFinished" &&
    isAdminUser &&
    !hasPending &&
    realParticipants.length > 0 &&
    allWeightsDone;

  const canResolveIssue =
    stage === "alternativeEvaluation" &&
    isAdminUser &&
    !hasPending &&
    realParticipants.length > 0 &&
    allEvalsDone;

  const canEvaluateWeights =
    stage === "criteriaWeighting" &&
    isExpertAccepted &&
    realParticipants.some(
      (participation) =>
        sameId(participation.expert?._id, userId) &&
        !participation.weightsCompleted
    );

  const canEvaluateAlternatives =
    stage === "alternativeEvaluation" &&
    isExpertAccepted &&
    realParticipants.some(
      (participation) =>
        sameId(participation.expert?._id, userId) &&
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

  let statusLabel = ACTIVE_STAGE_META[stage]?.label ?? stage;
  let statusKey = stage;

  if (stage === "finished") {
    statusLabel = "Finished";
    statusKey = "finished";
  } else if (waitingAdmin) {
    statusLabel = "Waiting for admin";
    statusKey = "waitingAdmin";
  } else if (nextAction) {
    statusLabel = nextAction.label;
    statusKey = nextAction.key;
  } else {
    statusLabel = "Waiting experts";
    statusKey = "waitingExperts";
  }

  const sortPriority = waitingAdmin
    ? ACTIVE_ACTION_META.waitingAdmin?.sortPriority ?? 60
    : nextAction
      ? nextAction.sortPriority
      : 80;

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

  const participatedExperts =
    stage === "criteriaWeighting" || stage === "weightsFinished"
      ? acceptedExperts.filter(
        (participation) => participation.weightsCompleted === true
      )
      : acceptedExperts.filter(
        (participation) => participation.evaluationCompleted === true
      );

  const acceptedButNotEvaluated =
    stage === "criteriaWeighting" || stage === "weightsFinished"
      ? acceptedExperts.filter(
        (participation) => !participation.weightsCompleted
      )
      : acceptedExperts.filter(
        (participation) => !participation.evaluationCompleted
      );

  const evaluated = participatedExperts.some((participation) =>
    sameId(participation.expert?._id, userId)
  );

  const role =
    isAdminUser && isExpertAccepted
      ? "both"
      : isAdminUser
        ? "admin"
        : isExpertAccepted
          ? "expert"
          : "viewer";

  const responseModelParameters = cleanModelParameters(issue.modelParameters);

  const hasDirectWeights = detectHasDirectWeights(issue);
  const hasAlternativeConsensus =
    detectHasAlternativeConsensusEnabled(issue);

  const workflowSteps = buildWorkflowStepsStable({
    hasDirectWeights,
    hasAlternativeConsensus,
  });

  const responseConsensusHistory =
    Array.isArray(consensusHistoryRounds) ? consensusHistoryRounds : [];

  return {
    taskItems,
    issueView: {
      id: issueId,
      name: issue.name,
      creator: issue.admin?.email,
      description: issue.description,
      model: issue.model,
      evaluationStructure,
      isConsensus: Boolean(issue.isConsensus),
      currentStage: stage,
      weightingMode: issue.weightingMode,
      ...(issue.model?.isConsensus && {
        consensusMaxPhases: issue.consensusMaxPhases || "Unlimited",
        consensusThreshold: issue.consensusThreshold,
        consensusCurrentPhase,
      }),
      creationDate: issue.creationDate || null,
      createdAt: issue.createdAt ?? null,
      closureDate: issue.closureDate || null,
      isAdmin: isAdminUser,
      isExpert: isExpertAccepted,
      role,
      alternatives: alternativeNames,
      criteria: criteriaTree,
      evaluated,
      totalExperts:
        participatedExperts.length +
        pendingExperts.length +
        declinedExperts.length +
        acceptedButNotEvaluated.length,
      participatedExperts: participatedExperts
        .map((participation) => participation.expert.email)
        .sort(),
      pendingExperts: pendingExperts
        .map((participation) => participation.expert.email)
        .sort(),
      notAcceptedExperts: declinedExperts
        .map((participation) => participation.expert.email)
        .sort(),
      acceptedButNotEvaluatedExperts: acceptedButNotEvaluated
        .map((participation) => participation.expert.email)
        .sort(),
      statusFlags,
      progress: {
        weightsDone,
        evalsDone,
        totalAccepted,
      },
      finalWeights: finalWeightsMap,
      consensusHistory: responseConsensusHistory,
      consensusRounds: responseConsensusHistory,
      modelParameters: responseModelParameters,
      myParticipation: myParticipation
        ? {
          invitationStatus: myParticipation.invitationStatus,
          weightsCompleted: Boolean(myParticipation.weightsCompleted),
          evaluationCompleted: Boolean(myParticipation.evaluationCompleted),
          joinedAt: myParticipation.joinedAt || null,
        }
        : null,
      actions,
      nextAction,
      ui: {
        stage,
        stageLabel: ACTIVE_STAGE_META[stage]?.label ?? stage,
        stageColorKey: ACTIVE_STAGE_META[stage]?.colorKey ?? "default",
        statusKey,
        statusLabel,
        sortPriority,
        deadline,
        hasDirectWeights,
        hasAlternativeConsensus,
        workflowSteps,
        permissions: {
          evaluateWeights: canEvaluateWeights,
          evaluateAlternatives: canEvaluateAlternatives,
          computeWeights: canComputeWeights,
          resolveIssue: canResolveIssue,
          waitingAdmin,
          waitingExperts: statusKey === "waitingExperts",
        },
        modelParameters: responseModelParameters,
      },
    },
  };
};
