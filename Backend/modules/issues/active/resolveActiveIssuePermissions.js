import { ISSUE_STAGES } from "../../decisionPlugins/evaluations/evaluation.constants.js";
import { ACTIVE_ACTION_META, ACTIVE_STATUS_META } from "./activeIssueUiCatalog.js";

export const resolveActiveIssuePermissions = ({
  stage,
  stageMeta,
  isAdminUser,
  hasPending,
  totalAccepted,
  completedWeightEvaluations,
  completedAlternativeEvaluations,
  acceptedUserParticipation,
}) => {
  const allWeightsDone =
    totalAccepted > 0 && completedWeightEvaluations === totalAccepted;
  const allEvalsDone =
    totalAccepted > 0 && completedAlternativeEvaluations === totalAccepted;

  const waitingAdmin =
    !isAdminUser &&
    !hasPending &&
    ((stage === ISSUE_STAGES.WEIGHTS_FINISHED && allWeightsDone) ||
      (stage === ISSUE_STAGES.ALTERNATIVE_EVALUATION && allEvalsDone));

  const canComputeWeights =
    stage === ISSUE_STAGES.WEIGHTS_FINISHED &&
    isAdminUser &&
    !hasPending &&
    totalAccepted > 0 &&
    allWeightsDone;

  const canResolveIssue =
    stage === ISSUE_STAGES.ALTERNATIVE_EVALUATION &&
    isAdminUser &&
    !hasPending &&
    totalAccepted > 0 &&
    allEvalsDone;

  const canEvaluateWeights =
    stage === ISSUE_STAGES.CRITERIA_WEIGHTING &&
    acceptedUserParticipation !== undefined &&
    !acceptedUserParticipation.weightsCompleted;

  const canEvaluateAlternatives =
    stage === ISSUE_STAGES.ALTERNATIVE_EVALUATION &&
    acceptedUserParticipation !== undefined &&
    !acceptedUserParticipation.evaluationCompleted;

  const waitingExperts =
    (hasPending && stage !== ISSUE_STAGES.FINISHED) ||
    (!waitingAdmin &&
      !canResolveIssue &&
      !canComputeWeights &&
      !canEvaluateWeights &&
      !canEvaluateAlternatives &&
      stage !== ISSUE_STAGES.FINISHED);

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

  if (stage !== ISSUE_STAGES.FINISHED) {
    if (waitingAdmin) {
      statusLabel = ACTIVE_STATUS_META.waitingAdmin.label;
      statusKey = ACTIVE_STATUS_META.waitingAdmin.key;
    } else if (nextAction) {
      statusLabel = nextAction.label;
      statusKey = nextAction.key;
    } else {
      statusLabel = ACTIVE_STATUS_META.waitingExperts.label;
      statusKey = ACTIVE_STATUS_META.waitingExperts.key;
    }
  }

  return {
    canComputeWeights,
    canResolveIssue,
    canEvaluateWeights,
    canEvaluateAlternatives,
    waitingAdmin,
    waitingExperts,
    statusFlags,
    actions,
    nextAction,
    statusLabel,
    statusKey,
  };
};
