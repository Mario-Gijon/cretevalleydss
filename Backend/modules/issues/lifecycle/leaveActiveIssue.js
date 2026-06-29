import { ExitUserIssue } from "../../../models/ExitUserIssue.js";
import { Participation } from "../../../models/Participations.js";
import { getIssueByIdOrThrow } from "../shared/queries.js";

import { mapIssueStageToExitStage } from "./mapIssueStageToExitStage.js";
import { cleanupIssueEvaluationsForExpertExit } from "./cleanupIssueEvaluationsForExpertExit.js";
import { applyOptionalSession } from "../../../utils/common/mongoose.js";

import {
  createBadRequestError,
  createForbiddenError,
  createInternalError,
} from "../../../utils/common/errors.js";
import { sameId, toIdString } from "../../../utils/common/ids.js";

const requireNonEmptyId = (value, field) => {
  const id = toIdString(value);

  if (!id) {
    throw createInternalError(`Exit user issue ${field} is invalid`, {
      field,
      details: {
        [field]: value ?? null,
      },
    });
  }

  return id;
};

const requireNonNegativeInteger = (value, field, details) => {
  if (!Number.isInteger(value) || value < 0) {
    throw createInternalError(`Exit user issue ${field} is invalid`, {
      field,
      details,
    });
  }

  return value;
};

const requireNonEmptyString = (value, field, details) => {
  if (typeof value !== "string" || value.trim() === "") {
    throw createInternalError(`Exit user issue ${field} is invalid`, {
      field,
      details,
    });
  }

  return value.trim();
};

const registerUserTimelineEvent = async ({
  issueId,
  userId,
  phase,
  stage,
  reason,
  action,
  hidden,
  session = null,
}) => {
  const normalizedIssueId = requireNonEmptyId(issueId, "issueId");
  const normalizedUserId = requireNonEmptyId(userId, "userId");
  const validatedPhase = requireNonNegativeInteger(phase, "phase", {
    issueId: normalizedIssueId,
    userId: normalizedUserId,
    phase,
  });
  const validatedStage = requireNonEmptyString(stage, "stage", {
    issueId: normalizedIssueId,
    userId: normalizedUserId,
    stage,
  });
  const validatedReason = requireNonEmptyString(reason, "reason", {
    issueId: normalizedIssueId,
    userId: normalizedUserId,
    reason,
  });
  const validatedAction = requireNonEmptyString(action, "action", {
    issueId: normalizedIssueId,
    userId: normalizedUserId,
    action,
  });
  const now = new Date();

  const historyEntry = {
    timestamp: now,
    phase: validatedPhase,
    stage: validatedStage,
    action: validatedAction,
    reason: validatedReason,
  };

  await applyOptionalSession(
    ExitUserIssue.findOneAndUpdate(
      { issue: normalizedIssueId, user: normalizedUserId },
      {
        $setOnInsert: {
          issue: normalizedIssueId,
          user: normalizedUserId,
        },
        $set: {
          hidden,
          timestamp: now,
          phase: validatedPhase,
          stage: validatedStage,
          reason: validatedReason,
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

export const registerUserEntry = async ({
  issueId,
  userId,
  phase,
  stage,
  reason,
  session = null,
}) => {
  await registerUserTimelineEvent({
    issueId,
    userId,
    phase,
    stage,
    reason,
    action: "entered",
    hidden: false,
    session,
  });
};

export const registerUserExit = async ({
  issueId,
  userId,
  phase,
  stage,
  reason,
  session = null,
}) => {
  await registerUserTimelineEvent({
    issueId,
    userId,
    phase,
    stage,
    reason,
    action: "exited",
    hidden: true,
    session,
  });
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

  if (sameId(issue.ownerId, userId)) {
    throw createForbiddenError("An owner can not leave an issue");
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

  await cleanupIssueEvaluationsForExpertExit({
    issue,
    expertId: userId,
    session,
  });

  await applyOptionalSession(
    Participation.deleteOne({ _id: participation._id }),
    session
  );

  const currentPhase = issue.consensusPhase;
  const stageForLog = mapIssueStageToExitStage(issue.currentStage, {
    issueId: issue._id,
  });

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
  issue,
  expertId,
  session = null,
}) => {
  return cleanupIssueEvaluationsForExpertExit({
    issue,
    expertId,
    session,
  });
};
