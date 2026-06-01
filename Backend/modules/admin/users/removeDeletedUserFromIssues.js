import { Consensus } from "../../../models/Consensus.js";
import { IssueEvaluation } from "../../../models/IssueEvaluations.js";
import { ExitUserIssue } from "../../../models/ExitUserIssue.js";
import { Notification } from "../../../models/Notifications.js";
import { Participation } from "../../../models/Participations.js";

import {
  deleteIssueCascade,
  getFinishedIssueVisibleUserIds,
  mapIssueStageToExitStage,
  registerUserExit,
} from "../../issues/lifecycle/index.js";

import { toIdString } from "../../../utils/common/ids.js";
import { applyOptionalSession } from "../../../utils/common/mongoose.js";

const ACCOUNT_DELETED_BY_ADMIN_REASON = "Expert account deleted by admin";

const getExitPhaseForIssue = async ({
  issueId,
  fallbackIfMissing,
  session = null,
}) => {
  const latestConsensus = await applyOptionalSession(
    Consensus.findOne({ issue: issueId }).sort({ phase: -1 }),
    session
  );

  return latestConsensus ? latestConsensus.phase + 1 : fallbackIfMissing;
};

const syncActiveIssueStageAfterUserRemoval = async ({
  issue,
  remainingParticipations,
  session = null,
}) => {
  if (issue.currentStage !== "criteriaWeighting") {
    return false;
  }

  const relevantParticipations = remainingParticipations.filter(
    (participation) =>
      ["accepted", "pending"].includes(participation.invitationStatus)
  );

  const totalParticipants = relevantParticipations.length;
  const totalWeightsDone = relevantParticipations.filter(
    (participation) => participation.weightsCompleted
  ).length;

  if (
    totalParticipants > 0 &&
    totalParticipants === totalWeightsDone &&
    issue.currentStage !== "weightsFinished"
  ) {
    issue.currentStage = "weightsFinished";
    await issue.save({ session });
    return true;
  }

  return false;
};

const removeUserFromActiveIssue = async ({
  issue,
  participation,
  user,
  summary,
  session = null,
}) => {
  const [deleteIssueEvaluationsResult] = await Promise.all([
    applyOptionalSession(
      IssueEvaluation.deleteMany({
        issue: issue._id,
        expert: user._id,
      }),
      session
    ),
    applyOptionalSession(
      Notification.deleteMany({
        issue: issue._id,
        expert: user._id,
      }),
      session
    ),
    applyOptionalSession(
      Participation.deleteOne({ _id: participation._id }),
      session
    ),
  ]);

  summary.activeIssueEvaluationsDeleted +=
    deleteIssueEvaluationsResult.deletedCount || 0;

  const remainingParticipations = await applyOptionalSession(
    Participation.find({ issue: issue._id }),
    session
  );

  if (remainingParticipations.length === 0) {
    await deleteIssueCascade({
      issueId: issue._id,
      session,
    });

    summary.activeIssuesDeleted += 1;
    return;
  }

  const phase = await getExitPhaseForIssue({
    issueId: issue._id,
    fallbackIfMissing: 1,
    session,
  });

  await registerUserExit({
    issueId: issue._id,
    userId: user._id,
    phase,
    stage: mapIssueStageToExitStage(issue.currentStage),
    reason: ACCOUNT_DELETED_BY_ADMIN_REASON,
    session,
  });

  await syncActiveIssueStageAfterUserRemoval({
    issue,
    remainingParticipations,
    session,
  });

  summary.activeIssuesUpdated += 1;
};

const removeUserFromFinishedIssue = async ({
  issue,
  user,
  summary,
  session = null,
}) => {
  const phase = await getExitPhaseForIssue({
    issueId: issue._id,
    fallbackIfMissing: null,
    session,
  });

  await registerUserExit({
    issueId: issue._id,
    userId: user._id,
    phase,
    stage: mapIssueStageToExitStage(issue.currentStage),
    reason: ACCOUNT_DELETED_BY_ADMIN_REASON,
    session,
  });

  await applyOptionalSession(
    Notification.deleteMany({
      issue: issue._id,
      expert: user._id,
    }),
    session
  );

  summary.finishedIssuesHidden += 1;

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

  if (!allVisibleUsersHaveHidden) {
    return;
  }

  await deleteIssueCascade({
    issueId: issue._id,
    session,
  });

  summary.finishedIssuesDeleted += 1;
};

export const removeDeletedUserFromIssues = async ({
  issues,
  participationsByIssueId,
  user,
  summary,
  session = null,
}) => {
  for (const issue of issues) {
    const participation = participationsByIssueId.get(toIdString(issue._id));

    if (!participation) {
      continue;
    }

    if (issue.active) {
      await removeUserFromActiveIssue({
        issue,
        participation,
        user,
        summary,
        session,
      });
      continue;
    }

    await removeUserFromFinishedIssue({
      issue,
      user,
      summary,
      session,
    });
  }
};
