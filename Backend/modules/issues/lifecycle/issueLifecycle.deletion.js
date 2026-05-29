import { Alternative } from "../../../models/Alternatives.js";
import { Consensus } from "../../../models/Consensus.js";
import { Criterion } from "../../../models/Criteria.js";
import { IssueEvaluation } from "../../../models/IssueEvaluations.js";
import { ExitUserIssue } from "../../../models/ExitUserIssue.js";
import { IssueExpressionDomain } from "../../../models/IssueExpressionDomains.js";
import { Issue } from "../../../models/Issues.js";
import { IssueScenario } from "../../../models/IssueScenarios.js";
import { IssueStageResult } from "../../../models/IssueStageResults.js";
import { Notification } from "../../../models/Notifications.js";
import { Participation } from "../../../models/Participations.js";

import { getNextConsensusPhase } from "../shared/queries.js";
import { mapIssueStageToExitStage } from "./issueLifecycle.stage.js";
import { registerUserExit } from "./issueLifecycle.exits.js";
import { getIssueOrThrow, withOptionalSession } from "./issueLifecycle.shared.js";

import {
  createBadRequestError,
  createForbiddenError,
} from "../../../utils/common/errors.js";
import {
  sameId,
  toIdString,
  uniqueIdStrings,
} from "../../../utils/common/ids.js";

export const deleteIssueCascade = async ({ issueId, session = null }) => {
  await Promise.all([
    withOptionalSession(IssueEvaluation.deleteMany({ issue: issueId }), session),
    withOptionalSession(Alternative.deleteMany({ issue: issueId }), session),
    withOptionalSession(Criterion.deleteMany({ issue: issueId }), session),
    withOptionalSession(Participation.deleteMany({ issue: issueId }), session),
    withOptionalSession(Consensus.deleteMany({ issue: issueId }), session),
    withOptionalSession(Notification.deleteMany({ issue: issueId }), session),
    withOptionalSession(IssueExpressionDomain.deleteMany({ issue: issueId }), session),
    withOptionalSession(ExitUserIssue.deleteMany({ issue: issueId }), session),
    withOptionalSession(IssueScenario.deleteMany({ issue: issueId }), session),
    withOptionalSession(IssueStageResult.deleteMany({ issue: issueId }), session),
  ]);

  await withOptionalSession(Issue.deleteOne({ _id: issueId }), session);
};

export const deleteActiveIssueAsAdmin = async ({
  issueId,
  userId,
  session = null,
}) => {
  const issue = await getIssueOrThrow({ issueId, session });

  if (!sameId(issue.admin, userId)) {
    throw createForbiddenError("You are not the admin of this issue");
  }

  if (!issue.active) {
    throw createBadRequestError("Issue is not active and cannot be deleted");
  }

  const issueName = issue.name;

  await deleteIssueCascade({
    issueId: issue._id,
    session,
  });

  return { issueName };
};

export const getFinishedIssueVisibleUserIds = async ({
  issue,
  session = null,
}) => {
  const acceptedParticipations = await withOptionalSession(
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

export const hideFinishedIssueForUserFlow = async ({
  issueId,
  userId,
  session = null,
}) => {
  const issue = await getIssueOrThrow({ issueId, session });

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

  const currentPhase = await getNextConsensusPhase(issue._id);
  const stageForLog = mapIssueStageToExitStage(issue.currentStage);

  await registerUserExit({
    issueId: issue._id,
    userId,
    phase: currentPhase,
    stage: stageForLog,
    reason: "Issue finished and removed for user",
    session,
  });

  const hiddenExits = await withOptionalSession(
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
