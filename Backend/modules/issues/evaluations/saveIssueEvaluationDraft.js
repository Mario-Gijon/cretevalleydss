import { buildDecisionContext } from "./buildDecisionContext.js";
import { loadIssueEvaluationContext } from "./loadIssueEvaluationContext.js";
import {
  cloneSerializable,
  persistIssueEvaluationOperation,
} from "./issueEvaluationPersistence.js";
import { createIssueEventOperationMetadata } from "../events/index.js";

export const saveIssueEvaluationDraft = async ({
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
    mode: "draft",
    payload,
    decisionContext,
  });

  await persistIssueEvaluationOperation({
    issueId: issue._id,
    userId,
    actorId: userId,
    stage,
    consensusPhase: issue.consensusPhase,
    action: "draftSaved",
    structureKey: structure.key,
    rawPayload,
    normalizedPayload,
    decisionContext: decisionContextSnapshot,
    completed: false,
    submittedAt: null,
    occurredAt: eventMetadata.occurredAt,
    correlationId: eventMetadata.correlationId,
    session,
  });

  return {
    message: "Evaluation draft saved successfully",
    stage,
    structureKey: structure.key,
    consensusPhase: issue.consensusPhase,
    completed: false,
  };
};
