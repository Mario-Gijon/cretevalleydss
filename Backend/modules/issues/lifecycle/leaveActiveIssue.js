import { IssueEvaluation } from "../../../models/IssueEvaluations.js";
import { ExitUserIssue } from "../../../models/ExitUserIssue.js";
import { Participation } from "../../../models/Participations.js";
import { getIssueByIdOrThrow } from "../shared/queries.js";

import { mapIssueStageToExitStage } from "./mapIssueStageToExitStage.js";
import { applyOptionalSession } from "../../../utils/common/mongoose.js";

import {
  createBadRequestError,
  createForbiddenError,
} from "../../../utils/common/errors.js";
import { sameId } from "../../../utils/common/ids.js";

export const registerUserExit = async ({
  issueId,
  userId,
  phase,
  stage,
  reason,
  session = null,
}) => {
  const now = new Date();

  const historyEntry = {
    timestamp: now,
    phase,
    stage,
    action: "exited",
    reason,
  };

  await applyOptionalSession(
    ExitUserIssue.findOneAndUpdate(
      { issue: issueId, user: userId },
      {
        $setOnInsert: {
          issue: issueId,
          user: userId,
        },
        $set: {
          hidden: true,
          timestamp: now,
          phase,
          stage,
          reason,
        },
        $push: {
          history: historyEntry,
        },
      },
      { upsert: true, new: true }
    ),
    session
  );
};

export const leaveActiveIssue = async ({
  issueId,
  userId,
  session = null,
}) => {
  const issue = await getIssueByIdOrThrow(issueId, { lean: false, session });

  if (!issue.active) {
    throw createBadRequestError("Issue is not active");
  }

  if (sameId(issue.admin, userId)) {
    throw createForbiddenError("An admin can not leave an issue");
  }

  const participation = await applyOptionalSession(
    Participation.findOne({
      issue: issue._id,
      expert: userId,
    }),
    session
  );

  if (!participation) {
    throw createBadRequestError("You are not a participant of this issue");
  }

  await cleanupExpertDraftsOnExit({
    issueId: issue._id,
    expertId: userId,
    session,
  });

  await applyOptionalSession(
    Participation.deleteOne({ _id: participation._id }),
    session
  );

  const currentPhase = issue.consensusPhase;
  const stageForLog = mapIssueStageToExitStage(issue.currentStage);

  await registerUserExit({
    issueId: issue._id,
    userId,
    phase: currentPhase,
    stage: stageForLog,
    reason: "Left by user",
    session,
  });

  return {
    issueName: issue.name,
  };
};

export const cleanupExpertDraftsOnExit = async ({
  issueId,
  expertId,
  session = null,
}) => {
  await applyOptionalSession(
    IssueEvaluation.deleteMany({
      issue: issueId,
      expert: expertId,
      completed: false,
    }),
    session
  );
};
