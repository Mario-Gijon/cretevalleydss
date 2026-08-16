import { IssueStageResult } from "../../../models/IssueStageResults.js";
import {
  createBadRequestError,
  createInternalError,
} from "../../../utils/common/errors.js";
import { toIdString } from "../../../utils/common/ids.js";
import { EVALUATION_STAGES } from "../../decisionPlugins/evaluations/evaluationStages.js";

export const resolveAlternativeResultOrThrow = async ({ issue, phase }) => {
  const query = {
    issue: issue._id,
    stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
  };
  if (phase !== undefined) query.consensusPhase = phase;

  const resultQuery = IssueStageResult.findOne(query);
  if (phase === undefined) {
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

  const resolvedPhase = latestAlternativeResult.consensusPhase;

  if (!Number.isInteger(resolvedPhase) || resolvedPhase < 0) {
    throw createInternalError("Alternative evaluation result has invalid consensus phase", {
      field: "consensusPhase",
      details: {
        issueId: toIdString(issue._id),
        consensusPhase: resolvedPhase,
      },
    });
  }

  return {
    latestAlternativeResult,
    phase: resolvedPhase,
  };
};

export const resolveLatestAlternativeResultOrThrow = resolveAlternativeResultOrThrow;

/**
 * Scenario replay phases are the canonical alternative-evaluation stage
 * results, not a client-selected subset. The unique index on stage results
 * makes each phase a single historical source of truth.
 */
export const discoverScenarioReplayPhasesOrThrow = async ({ issue }) => {
  const results = await IssueStageResult.find({
    issue: issue._id,
    stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
  })
    .sort({ consensusPhase: 1, _id: 1 })
    .lean();

  if (!results.length) {
    throw createBadRequestError(
      "Alternative evaluation result is required before creating model runs",
      { field: "stageResult" }
    );
  }

  const phases = [];
  const seen = new Set();
  for (const result of results) {
    const phase = result?.consensusPhase;
    if (!Number.isInteger(phase) || phase < 0) {
      throw createInternalError("Alternative evaluation result has invalid consensus phase", {
        field: "consensusPhase",
        details: { issueId: toIdString(issue._id), consensusPhase: phase },
      });
    }
    if (seen.has(phase)) {
      throw createInternalError("Alternative evaluation results contain a duplicate consensus phase", {
        field: "consensusPhase",
        details: { issueId: toIdString(issue._id), consensusPhase: phase },
      });
    }
    seen.add(phase);
    phases.push(phase);
  }

  return phases;
};
