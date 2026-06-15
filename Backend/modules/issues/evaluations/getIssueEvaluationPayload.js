import { buildEvaluationStructureContext } from "./buildEvaluationStructureContext.js";
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

  const evaluationContext = await buildEvaluationStructureContext({
    issue,
    structure,
    stage,
    consensusPhase: issue.consensusPhase,
  });

  const payload = await structure.get({
    payload: storedEvaluation?.payload ?? {},
    evaluationContext,
  });

  const collectiveReference = await loadPreviousCollectiveReference({
    issue,
    stage,
  });

  return {
    stage,
    structureKey: structure.key,
    consensusPhase: issue.consensusPhase,
    payload,
    collectiveReference,
    completed: storedEvaluation?.completed ?? false,
    submittedAt: storedEvaluation?.submittedAt ?? null,
  };
};
