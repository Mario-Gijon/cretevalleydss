import { IssueStageResult } from "../../../models/IssueStageResults.js";
import { EVALUATION_STAGES } from "../../decisionPlugins/evaluations/evaluationStages.js";
import { isPlainObject } from "../../../utils/common/objects.js";

export const loadPreviousCollectiveReference = async ({ issue, stage }) => {
  if (stage !== EVALUATION_STAGES.ALTERNATIVE_EVALUATION) {
    return null;
  }

  const currentConsensusPhase = Number(issue?.consensusPhase);
  if (!Number.isInteger(currentConsensusPhase) || currentConsensusPhase <= 0) {
    return null;
  }

  const previousConsensusPhase = currentConsensusPhase - 1;
  const previousStageResult = await IssueStageResult.findOne({
    issue: issue?._id,
    stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
    consensusPhase: previousConsensusPhase,
  }).lean();

  if (!previousStageResult) {
    return null;
  }

  return {
    consensusPhase: previousConsensusPhase,
    collectiveEvaluations: isPlainObject(previousStageResult.collectiveEvaluations)
      ? previousStageResult.collectiveEvaluations
      : {},
  };
};
