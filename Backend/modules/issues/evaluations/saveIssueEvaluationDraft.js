import { buildEvaluationStructureContext } from "./buildEvaluationStructureContext.js";
import { loadIssueEvaluationContext } from "./loadIssueEvaluationContext.js";
import { upsertIssueEvaluation } from "./issueEvaluationPersistence.js";

export const saveIssueEvaluationDraft = async ({
  issueId,
  userId,
  stage,
  payload,
}) => {
  const { issue, structure } = await loadIssueEvaluationContext({
    issueId,
    userId,
    stage,
  });

  const structureContext = await buildEvaluationStructureContext({
    issue,
  });

  const normalizedPayload = await structure.save({
    mode: "draft",
    payload,
    structureContext,
  });

  await upsertIssueEvaluation({
    issueId: issue._id,
    userId,
    stage,
    consensusPhase: issue.consensusPhase,
    payload: normalizedPayload,
    completed: false,
    submittedAt: null,
  });

  return {
    message: "Evaluation draft saved successfully",
    stage,
    structureKey: structure.key,
    consensusPhase: issue.consensusPhase,
    completed: false,
  };
};
