import { buildDecisionContext } from "./buildDecisionContext.js";
import { loadIssueEvaluationContext } from "./loadIssueEvaluationContext.js";
import { loadPreviousCollectiveReference } from "./loadPreviousCollectiveReference.js";
import { EVALUATION_STAGES } from "../../decisionPlugins/evaluations/evaluationStages.js";
import {
  cloneSerializable,
  findAuthoritativeCurrentEvaluation,
  findPreviousCompletedEvaluation,
} from "./issueEvaluationPersistence.js";

export const getIssueEvaluationPayload = async ({ issueId, userId, stage }) => {
  const { issue, structure } = await loadIssueEvaluationContext({
    issueId,
    userId,
    stage,
  });

  const currentEvaluation = await findAuthoritativeCurrentEvaluation({
    issueId: issue._id,
    userId,
    stage,
    consensusPhase: issue.consensusPhase,
    allowSystemGenerated: issue.simulateConsensus === true,
  });

  const decisionContext = await buildDecisionContext({
    issue,
    structure,
    stage,
    consensusPhase: issue.consensusPhase,
  });

  let payload;

  if (currentEvaluation) {
    // An absent evaluation document is semantically different from a stored
    // (and potentially malformed) empty payload. Structures own the former
    // case; they must still validate every persisted payload strictly.
    payload = await structure.get({
      payload: currentEvaluation.payload,
      decisionContext,
    });
  } else {
    const previousEvaluation =
      issue.isConsensus === true &&
      stage === EVALUATION_STAGES.ALTERNATIVE_EVALUATION
        ? await findPreviousCompletedEvaluation({
            issueId: issue._id,
            userId,
            stage,
            consensusPhase: issue.consensusPhase,
            structureKey: structure.key,
          })
        : null;

    if (previousEvaluation) {
      try {
        payload = await structure.get({
          payload: cloneSerializable(previousEvaluation.payload),
          decisionContext,
        });
      } catch {
        payload = await structure.get({ payload: null, decisionContext });
      }
    } else {
      payload = await structure.get({ payload: null, decisionContext });
    }
  }

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
    completed: currentEvaluation?.completed ?? false,
    submittedAt: currentEvaluation?.submittedAt ?? null,
  };
};
