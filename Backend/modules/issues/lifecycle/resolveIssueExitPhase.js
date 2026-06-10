import { IssueStageResult } from "../../../models/IssueStageResults.js";
import { EVALUATION_STAGES } from "../../decisionEngine/evaluations/evaluation.constants.js";
import { createInternalError } from "../../../utils/common/errors.js";
import { toIdString } from "../../../utils/common/ids.js";
import { applyOptionalSession } from "../../../utils/common/mongoose.js";

export const resolveIssueExitPhase = async ({ issueId, session = null }) => {
  const latestAlternativeStageResult = await applyOptionalSession(
    IssueStageResult.findOne({
      issue: issueId,
      stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
    }).sort({ consensusPhase: -1 }),
    session
  );

  if (!latestAlternativeStageResult) {
    return 1;
  }

  const { consensusPhase } = latestAlternativeStageResult;

  if (!Number.isInteger(consensusPhase) || consensusPhase < 1) {
    throw createInternalError("IssueStageResult consensusPhase is invalid", {
      field: "consensusPhase",
      details: {
        issueId: toIdString(issueId) || null,
        consensusPhase,
      },
    });
  }

  return consensusPhase + 1;
};
