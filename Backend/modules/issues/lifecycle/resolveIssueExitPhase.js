import { IssueStageResult } from "../../../models/IssueStageResults.js";
import { EVALUATION_STAGES } from "../../decisionEngine/evaluations/evaluation.constants.js";
import { applyOptionalSession } from "../../../utils/common/mongoose.js";

export const resolveIssueExitPhase = async ({
  issueId,
  fallbackIfMissing,
  session = null,
}) => {
  const latestAlternativeStageResult = await applyOptionalSession(
    IssueStageResult.findOne({
      issue: issueId,
      stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
    }).sort({ consensusPhase: -1 }),
    session
  );

  return latestAlternativeStageResult
    ? latestAlternativeStageResult.consensusPhase + 1
    : fallbackIfMissing;
};
