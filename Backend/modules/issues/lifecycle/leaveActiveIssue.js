import { IssueEvaluation } from "../../../models/IssueEvaluations.js";
import { ExitUserIssue } from "../../../models/ExitUserIssue.js";
import { Participation } from "../../../models/Participations.js";
import { getIssueByIdOrThrow } from "../shared/queries.js";

import { mapIssueStageToExitStage } from "./mapIssueStageToExitStage.js";
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

const requirePositiveInteger = (value, field, details) => {
  if (!Number.isInteger(value) || value < 1) {
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

export const registerUserExit = async ({
  issueId,
  userId,
  phase,
  stage,
  reason,
  session = null,
}) => {
  const normalizedIssueId = requireNonEmptyId(issueId, "issueId");
  const normalizedUserId = requireNonEmptyId(userId, "userId");
  const validatedPhase = requirePositiveInteger(phase, "phase", {
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
  const now = new Date();

  const historyEntry = {
    timestamp: now,
    phase: validatedPhase,
    stage: validatedStage,
    action: "exited",
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
          hidden: true,
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
