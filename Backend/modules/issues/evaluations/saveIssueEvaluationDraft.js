import { buildDecisionContext } from "./buildDecisionContext.js";
import { loadIssueEvaluationContext } from "./loadIssueEvaluationContext.js";
import {
  cloneSerializable,
  persistIssueEvaluationOperation,
} from "./issueEvaluationPersistence.js";

export const saveIssueEvaluationDraft = async ({
  issueId,
  userId,
  stage,
  payload,
  session = null,
}) => {
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
