import { advanceToWeightsFinishedAfterSubmit } from "./advanceIssueAfterEvaluationSubmit.js";
import { buildDecisionContext } from "./buildDecisionContext.js";
import { loadIssueEvaluationContext } from "./loadIssueEvaluationContext.js";
import { markParticipationCompleted } from "./issueEvaluationParticipation.js";
import {
  cloneSerializable,
  persistIssueEvaluationOperation,
} from "./issueEvaluationPersistence.js";
import { createIssueEventOperationMetadata } from "../events/index.js";
import { createWorkflowNotification } from "../notifications/index.js";
import { Participation } from "../../../models/Participations.js";
import { EVALUATION_STAGES } from "../../decisionPlugins/evaluations/evaluationStages.js";

const notifyOwnerWhenEvaluationPhaseCompletes = async ({
  issue,
  stage,
  actorUserId,
  session,
}) => {
  const participations = await Participation.find({ issue: issue._id })
    .select("invitationStatus weightsCompleted evaluationCompleted")
    .session(session)
    .lean();
  const accepted = participations.filter(
    ({ invitationStatus }) => invitationStatus === "accepted"
  );
  const hasPendingInvitation = participations.some(
    ({ invitationStatus }) => invitationStatus === "pending"
  );
  const completionField =
    stage === EVALUATION_STAGES.CRITERIA_WEIGHTING
      ? "weightsCompleted"
      : "evaluationCompleted";

  if (
    hasPendingInvitation ||
    accepted.length === 0 ||
    !accepted.every((participation) => participation[completionField] === true)
  ) {
    return;
  }

  const isConsensusRound =
    stage === EVALUATION_STAGES.ALTERNATIVE_EVALUATION && issue.isConsensus === true;
  const phaseLabel = `consensus round ${issue.consensusPhase + 1}`;
  await createWorkflowNotification({
    recipientId: issue.ownerId,
    actorUserId,
    issue,
    type: isConsensusRound ? "consensusRoundCompleted" : `${stage}Completed`,
    message: isConsensusRound
      ? `All required experts completed ${phaseLabel}. You can compute consensus again.`
      : stage === EVALUATION_STAGES.CRITERIA_WEIGHTING
        ? "All required criteria-weight evaluations have been submitted. You can compute the next step."
        : "All required alternative evaluations have been submitted. You can resolve the next step.",
    eventKey: `phase-completed:${stage}:${issue.consensusPhase}`,
    session,
  });
};

export const submitIssueEvaluation = async ({
  issueId,
  userId,
  stage,
  payload,
  occurredAt = null,
  correlationId = null,
  session = null,
}) => {
  const eventMetadata =
    occurredAt && correlationId
      ? { occurredAt, correlationId }
      : createIssueEventOperationMetadata();
  const { issue, structure } = await loadIssueEvaluationContext({
    issueId,
    userId,
    stage,
    session,
  });

  const decisionContext = await buildDecisionContext({
    issue,
    structure,
    stage,
    consensusPhase: issue.consensusPhase,
  });
  const rawPayload = cloneSerializable(payload);
  const decisionContextSnapshot = cloneSerializable(decisionContext);

  const normalizedPayload = await structure.save({
    mode: "submit",
    payload,
    decisionContext,
  });

  const submittedAt = eventMetadata.occurredAt;

  await persistIssueEvaluationOperation({
    issueId: issue._id,
    userId,
    actorId: userId,
    stage,
    consensusPhase: issue.consensusPhase,
    action: "submitted",
    structureKey: structure.key,
    rawPayload,
    normalizedPayload,
    decisionContext: decisionContextSnapshot,
    completed: true,
    submittedAt,
    occurredAt: eventMetadata.occurredAt,
    correlationId: eventMetadata.correlationId,
    session,
  });

  await markParticipationCompleted({
    issueId: issue._id,
    userId,
    stage,
    issue,
    actorUser: userId,
    occurredAt: eventMetadata.occurredAt,
    correlationId: eventMetadata.correlationId,
    session,
  });

  await advanceToWeightsFinishedAfterSubmit({
    issue,
    stage,
    actorUser: userId,
    occurredAt: eventMetadata.occurredAt,
    correlationId: eventMetadata.correlationId,
    session,
  });

  await notifyOwnerWhenEvaluationPhaseCompletes({
    issue,
    stage,
    actorUserId: userId,
    session,
  });

  return {
    message: "Evaluation submitted successfully",
    stage,
    structureKey: structure.key,
    consensusPhase: issue.consensusPhase,
    completed: true,
    currentStage: issue.currentStage,
  };
};
