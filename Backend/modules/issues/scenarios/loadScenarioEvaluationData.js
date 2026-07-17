import { IssueStageResult } from "../../../models/IssueStageResults.js";
import {
  createBadRequestError,
  createInternalError,
} from "../../../utils/common/errors.js";
import { toIdString } from "../../../utils/common/ids.js";
import { EVALUATION_STAGES } from "../../decisionPlugins/evaluations/evaluationStages.js";

export const resolveAlternativeResultOrThrow = async ({ issue, sourcePhase }) => {
  if (sourcePhase !== undefined && issue.isConsensus !== true) {
    throw createBadRequestError("sourcePhase is only available for consensus issues", {
      field: "sourcePhase",
    });
  }

  const query = {
    issue: issue._id,
    stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
  };
  if (sourcePhase !== undefined) query.consensusPhase = sourcePhase;

  const resultQuery = IssueStageResult.findOne(query);
  if (sourcePhase === undefined) {
    resultQuery.sort({ consensusPhase: -1 });
  }
  const latestAlternativeResult = await resultQuery.lean();

  if (!latestAlternativeResult) {
    throw createBadRequestError(
      "Alternative evaluation result is required before creating model runs",
      {
        field: "stageResult",
      }
    );
  }

  const phase = latestAlternativeResult.consensusPhase;

  if (!Number.isInteger(phase) || phase < 0) {
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

export const resolveLatestAlternativeResultOrThrow = resolveAlternativeResultOrThrow;
