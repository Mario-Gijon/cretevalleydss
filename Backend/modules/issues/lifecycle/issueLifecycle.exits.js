import { CriteriaWeightEvaluation } from "../../../models/CriteriaWeightEvaluation.js";
import { Evaluation } from "../../../models/Evaluations.js";
import { ExitUserIssue } from "../../../models/ExitUserIssue.js";
import { Issue } from "../../../models/Issues.js";
import { Participation } from "../../../models/Participations.js";

import { getNextConsensusPhase } from "../issue.queries.js";
import { mapIssueStageToExitStage } from "./issueLifecycle.stage.js";

import {
  createBadRequestError,
  createForbiddenError,
  createNotFoundError,
} from "../../../utils/common/errors.js";
import { sameId } from "../../../utils/common/ids.js";
import { isValidObjectIdLike } from "../../../utils/common/mongoose.js";

const withOptionalSession = (query, session = null) =>
  session ? query.session(session) : query;

const getIssueOrThrow = async ({ issueId, session = null }) => {
  if (!issueId || !isValidObjectIdLike(issueId)) {
    throw createBadRequestError("Valid issue id is required", {
      field: "issueId",
    });
  }

  const issue = await withOptionalSession(Issue.findById(issueId), session);

  if (!issue) {
    throw createNotFoundError("Issue not found", {
      field: "issueId",
    });
  }

  return issue;
};

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

  await withOptionalSession(
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

export const leaveActiveIssueFlow = async ({
  issueId,
  userId,
  session = null,
}) => {
  const issue = await getIssueOrThrow({ issueId, session });

  if (!issue.active) {
    throw createBadRequestError("Issue is not active");
  }

  if (sameId(issue.admin, userId)) {
    throw createForbiddenError("An admin can not leave an issue");
  }

  const participation = await withOptionalSession(
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

  await withOptionalSession(
    Participation.deleteOne({ _id: participation._id }),
    session
  );

  const currentPhase = await getNextConsensusPhase(issue._id);
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
  await withOptionalSession(
    CriteriaWeightEvaluation.deleteMany({
      issue: issueId,
      expert: expertId,
      completed: false,
    }),
    session
  );

  const hasSubmittedSomething = await withOptionalSession(
    Evaluation.exists({
      issue: issueId,
      expert: expertId,
      $or: [
        { timestamp: { $ne: null } },
        { history: { $elemMatch: { timestamp: { $ne: null } } } },
      ],
    }),
    session
  );

  if (!hasSubmittedSomething) {
    await withOptionalSession(
      Evaluation.deleteMany({ issue: issueId, expert: expertId }),
      session
    );
  }
};
