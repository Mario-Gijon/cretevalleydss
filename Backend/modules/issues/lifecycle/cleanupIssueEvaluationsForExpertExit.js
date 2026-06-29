import { IssueEvaluation } from "../../../models/IssueEvaluations.js";
import { createInternalError } from "../../../utils/common/errors.js";
import { applyOptionalSession } from "../../../utils/common/mongoose.js";

const CRITERIA_WEIGHTING_STAGE = "criteriaWeighting";
const ALTERNATIVE_EVALUATION_STAGE = "alternativeEvaluation";
const issueUsesConsensusSemantics = (issue) =>
  issue?.isConsensus === true || issue?.simulateConsensus === true;

const getCurrentConsensusPhaseOrThrow = (issue) => {
  if (Number.isInteger(issue?.consensusPhase) && issue.consensusPhase >= 0) {
    return issue.consensusPhase;
  }

  throw createInternalError("Issue consensusPhase is invalid for evaluation cleanup", {
    field: "consensusPhase",
    details: {
      issueId: issue?._id ?? null,
      consensusPhase: issue?.consensusPhase ?? null,
    },
  });
};

const deleteManyWithOptionalSession = async ({
  filter,
  session = null,
}) => {
  const result = await applyOptionalSession(
    IssueEvaluation.deleteMany(filter),
    session
  );

  return typeof result?.deletedCount === "number" ? result.deletedCount : 0;
};

export const cleanupIssueEvaluationsForExpertExit = async ({
  issue,
  expertId,
  session = null,
}) => {
  const issueId = issue?._id;
  let deletedCount = 0;

  if (issue.currentStage === CRITERIA_WEIGHTING_STAGE) {
    deletedCount += await deleteManyWithOptionalSession({
      filter: {
        issue: issueId,
        expert: expertId,
        stage: CRITERIA_WEIGHTING_STAGE,
      },
      session,
    });
  }

  if (!issueUsesConsensusSemantics(issue)) {
    deletedCount += await deleteManyWithOptionalSession({
      filter: {
        issue: issueId,
        expert: expertId,
        stage: ALTERNATIVE_EVALUATION_STAGE,
      },
      session,
    });

    return {
      deletedCount,
    };
  }

  const currentConsensusPhase = getCurrentConsensusPhaseOrThrow(issue);

  deletedCount += await deleteManyWithOptionalSession({
    filter: {
      issue: issueId,
      expert: expertId,
      stage: ALTERNATIVE_EVALUATION_STAGE,
      $or: [
        { completed: { $ne: true } },
        { consensusPhase: { $gte: currentConsensusPhase } },
      ],
    },
    session,
  });

  return {
    deletedCount,
  };
};
