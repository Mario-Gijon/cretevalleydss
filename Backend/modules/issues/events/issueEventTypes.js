export const ISSUE_EVENT_TYPES = Object.freeze({
  PARTICIPATION_CREATED: "participation.created",
  INVITATION_CREATED: "invitation.created",
  INVITATION_ACCEPTED: "invitation.accepted",
  INVITATION_DECLINED: "invitation.declined",
  PARTICIPATION_ENTERED: "participation.entered",
  PARTICIPATION_LEFT: "participation.left",
  PARTICIPATION_REMOVED: "participation.removed",
  EXPERT_WEIGHTS_CHANGED: "expertWeights.changed",
  PARTICIPATION_COMPLETION_CHANGED: "participation.completion.changed",
  ISSUE_STAGE_CHANGED: "issue.stage.changed",
  CRITERIA_WEIGHTS_CHANGED: "criteriaWeights.changed",
  CONSENSUS_PHASE_STARTED: "consensus.phase.started",
  CONSENSUS_COMPUTED: "consensus.computed",
  CONSENSUS_PHASE_COMPLETED: "consensus.phase.completed",
  ISSUE_FINISHED: "issue.finished",
  MODEL_EXECUTION_STARTED: "model.execution.started",
  MODEL_EXECUTION_SUCCEEDED: "model.execution.succeeded",
  MODEL_EXECUTION_FAILED: "model.execution.failed",
  MODEL_EXECUTION_APPLIED: "model.execution.applied",
  MODEL_EXECUTION_APPLICATION_FAILED: "model.execution.applicationFailed",
});

export const ISSUE_EVENT_TYPE_VALUES = Object.freeze(
  Object.values(ISSUE_EVENT_TYPES)
);
