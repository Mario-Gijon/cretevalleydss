import { advanceToWeightsFinishedAfterSubmit } from "./advanceIssueAfterEvaluationSubmit.js";
import { buildEvaluationStructureContext } from "./buildEvaluationStructureContext.js";
import { loadIssueEvaluationContext } from "./loadIssueEvaluationContext.js";
import { markParticipationCompleted } from "./issueEvaluationParticipation.js";
import { upsertIssueEvaluation } from "./issueEvaluationPersistence.js";

export const submitIssueEvaluation = async ({
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

  const evaluationContext = await buildEvaluationStructureContext({
    issue,
    structure,
    stage,
    consensusPhase: issue.consensusPhase,
  });

  const normalizedPayload = await structure.save({
    mode: "submit",
    payload,
    evaluationContext,
  });

  await upsertIssueEvaluation({
    issueId: issue._id,
    userId,
    stage,
    consensusPhase: issue.consensusPhase,
    payload: normalizedPayload,
    completed: true,
    submittedAt: new Date(),
    session,
  });

  await markParticipationCompleted({
    issueId: issue._id,
    userId,
    stage,
    session,
  });

  await advanceToWeightsFinishedAfterSubmit({ issue, stage, session });

  return {
    message: "Evaluation submitted successfully",
    stage,
    structureKey: structure.key,
    consensusPhase: issue.consensusPhase,
    completed: true,
    currentStage: issue.currentStage,
  };
};
