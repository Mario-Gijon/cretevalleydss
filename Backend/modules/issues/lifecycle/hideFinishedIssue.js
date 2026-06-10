import { ExitUserIssue } from "../../../models/ExitUserIssue.js";
import { Notification } from "../../../models/Notifications.js";
import { Participation } from "../../../models/Participations.js";

import { getIssueByIdOrThrow } from "../shared/queries.js";
import { mapIssueStageToExitStage } from "./mapIssueStageToExitStage.js";
import { registerUserExit } from "./leaveActiveIssue.js";
import { deleteIssueCascade } from "./deleteIssueCascade.js";
import { applyOptionalSession } from "../../../utils/common/mongoose.js";

import {
  createBadRequestError,
  createForbiddenError,
  createInternalError,
} from "../../../utils/common/errors.js";
import {
  toIdString,
  uniqueIdStrings,
} from "../../../utils/common/ids.js";

const getFinishedIssueExitPhase = (issue) => {
  const { consensusPhase } = issue;

  if (!Number.isInteger(consensusPhase) || consensusPhase < 1) {
    throw createInternalError("Issue consensusPhase is invalid", {
      field: "consensusPhase",
      details: {
        issueId: toIdString(issue?._id) || null,
        consensusPhase,
      },
    });
  }

  return consensusPhase;
};

export const getFinishedIssueVisibleUserIds = async ({
  issue,
  session = null,
}) => {
  const acceptedParticipations = await applyOptionalSession(
    Participation.find({
      issue: issue._id,
      invitationStatus: "accepted",
    })
      .select("expert")
      .lean(),
    session
  );

  return uniqueIdStrings([
    issue.admin,
    ...acceptedParticipations.map((participation) => participation.expert),
  ]);
};

export const hideFinishedIssueForUser = async ({
  issueId,
  userId,
  session = null,
}) => {
  const issue = await getIssueByIdOrThrow(issueId, { lean: false, session });

  if (issue.active) {
    throw createBadRequestError("Issue is still active");
  }

  const visibleUserIds = await getFinishedIssueVisibleUserIds({
    issue,
    session,
  });

  if (!visibleUserIds.includes(toIdString(userId))) {
    throw createForbiddenError(
      "You are not allowed to remove this finished issue"
    );
  }

  const currentPhase = getFinishedIssueExitPhase(issue);
  const stageForLog = mapIssueStageToExitStage(issue.currentStage, {
    issueId: issue._id,
  });

  await registerUserExit({
    issueId: issue._id,
    userId,
    phase: currentPhase,
    stage: stageForLog,
    reason: "Issue finished and removed for user",
    session,
  });

  const hiddenExits = await applyOptionalSession(
    ExitUserIssue.find({
      issue: issue._id,
      hidden: true,
      user: { $in: visibleUserIds },
    })
      .select("user")
      .lean(),
    session
  );

  const hiddenUserIds = uniqueIdStrings(
    hiddenExits.map((exitDoc) => exitDoc.user)
  );

  const allVisibleUsersHaveHidden =
    visibleUserIds.length > 0 &&
    visibleUserIds.every((visibleUserId) =>
      hiddenUserIds.includes(visibleUserId)
    );

  if (allVisibleUsersHaveHidden) {
    await deleteIssueCascade({
      issueId: issue._id,
      session,
    });
  }

  return {
    issueName: issue.name,
    deletedPermanently: allVisibleUsersHaveHidden,
  };
};

export const hideFinishedIssueForDeletedUser = async ({
  issue,
  userId,
  reason,
  session = null,
}) => {
  const phase = getFinishedIssueExitPhase(issue);

  await registerUserExit({
    issueId: issue._id,
    userId,
    phase,
    stage: mapIssueStageToExitStage(issue.currentStage, {
      issueId: issue._id,
    }),
    reason,
    session,
  });

  await applyOptionalSession(
    Notification.deleteMany({
      issue: issue._id,
      expert: userId,
    }),
    session
  );

  const visibleUserIds = await getFinishedIssueVisibleUserIds({
    issue,
    session,
  });

  const hiddenExits = await applyOptionalSession(
    ExitUserIssue.find({
      issue: issue._id,
      hidden: true,
      user: { $in: visibleUserIds },
    })
      .select("user")
      .lean(),
    session
  );

  const hiddenUserIdSet = new Set(
    hiddenExits.map((exitDoc) => toIdString(exitDoc.user))
  );

  const allVisibleUsersHaveHidden =
    visibleUserIds.length > 0 &&
    visibleUserIds.every((visibleUserId) =>
      hiddenUserIdSet.has(toIdString(visibleUserId))
    );

  if (allVisibleUsersHaveHidden) {
    await deleteIssueCascade({
      issueId: issue._id,
      session,
    });
  }

  return {
    hidden: true,
    deletedPermanently: allVisibleUsersHaveHidden,
  };
};
