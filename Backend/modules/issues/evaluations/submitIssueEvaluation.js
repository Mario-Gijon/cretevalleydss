import { advanceToWeightsFinishedAfterSubmit } from "./advanceIssueAfterEvaluationSubmit.js";
import { buildDecisionContext } from "./buildDecisionContext.js";
import { loadIssueEvaluationContext } from "./loadIssueEvaluationContext.js";
import { markParticipationCompleted } from "./issueEvaluationParticipation.js";
import {
  cloneSerializable,
  persistIssueEvaluationOperation,
} from "./issueEvaluationPersistence.js";
import { createIssueEventOperationMetadata } from "../events/index.js";

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

  return {
    message: "Evaluation submitted successfully",
    stage,
    structureKey: structure.key,
    consensusPhase: issue.consensusPhase,
    completed: true,
    currentStage: issue.currentStage,
  };
};
