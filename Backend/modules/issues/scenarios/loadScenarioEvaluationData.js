import { IssueStageResult } from "../../../models/IssueStageResults.js";
import {
  createBadRequestError,
  createInternalError,
} from "../../../utils/common/errors.js";
import { toIdString } from "../../../utils/common/ids.js";
import { EVALUATION_STAGES } from "../../decisionPlugins/evaluations/evaluationStages.js";

export const resolveLatestAlternativeResultOrThrow = async ({ issue }) => {
  const latestAlternativeResult = await IssueStageResult.findOne({
    issue: issue._id,
    stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
  })
    .sort({ consensusPhase: -1 })
    .lean();

  if (!latestAlternativeResult) {
    throw createBadRequestError(
      "Alternative evaluation result is required before creating model runs",
      {
        field: "stageResult",
      }
    );
  }

  const phase = latestAlternativeResult.consensusPhase;

  if (!Number.isInteger(phase) || phase < 1) {
    throw createInternalError("Alternative evaluation result has invalid consensus phase", {
      field: "consensusPhase",
      details: {
        issueId: toIdString(issue._id),
        consensusPhase: phase,
      },
    });
  }

  return {
    latestAlternativeResult,
    phase,
  };
};
