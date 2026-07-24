import { buildDecisionContext } from "./buildDecisionContext.js";
import { loadIssueEvaluationContext } from "./loadIssueEvaluationContext.js";
import { loadPreviousCollectiveReference } from "./loadPreviousCollectiveReference.js";
import { findStoredEvaluation } from "./issueEvaluationPersistence.js";

export const getIssueEvaluationPayload = async ({ issueId, userId, stage }) => {
  const { issue, structure } = await loadIssueEvaluationContext({
    issueId,
    userId,
    stage,
  });

  const storedEvaluation = await findStoredEvaluation({
    issueId: issue._id,
    userId,
    stage,
    consensusPhase: issue.consensusPhase,
  });

  const decisionContext = await buildDecisionContext({
    issue,
    structure,
    stage,
    consensusPhase: issue.consensusPhase,
  });

  const payload = await structure.get({
    // An absent evaluation document is semantically different from a stored
    // (and potentially malformed) empty payload. Structures own the former
    // case; they must still validate every persisted payload strictly.
    payload: storedEvaluation ? storedEvaluation.payload : null,
    decisionContext,
  });

  const previousCollective = await loadPreviousCollectiveReference({
    issue,
    stage,
  });

  return {
    stage,
    structureKey: structure.key,
    consensusPhase: issue.consensusPhase,
    decisionContext,
    payload,
    collectivePayload: previousCollective?.collectiveEvaluations ?? null,
    completed: storedEvaluation?.completed ?? false,
    submittedAt: storedEvaluation?.submittedAt ?? null,
  };
};
