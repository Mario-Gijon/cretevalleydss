import { Alternative } from "../../../models/Alternatives.js";
import { Consensus } from "../../../models/Consensus.js";
import { CriteriaWeightEvaluation } from "../../../models/CriteriaWeightEvaluation.js";
import { Criterion } from "../../../models/Criteria.js";
import { Evaluation } from "../../../models/Evaluations.js";
import { ExitUserIssue } from "../../../models/ExitUserIssue.js";
import { IssueExpressionDomain } from "../../../models/IssueExpressionDomains.js";
import { Issue } from "../../../models/Issues.js";
import { IssueScenario } from "../../../models/IssueScenarios.js";
import { Notification } from "../../../models/Notificacions.js";
import { Participation } from "../../../models/Participations.js";

import { getNextConsensusPhase } from "../issue.queries.js";
import { mapIssueStageToExitStage } from "./issueLifecycle.stage.js";
import { registerUserExit } from "./issueLifecycle.exits.js";

import {
  createBadRequestError,
  createForbiddenError,
  createNotFoundError,
} from "../../../utils/common/errors.js";
import {
  sameId,
  toIdString,
  uniqueIdStrings,
} from "../../../utils/common/ids.js";
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

export const deleteIssueCascade = async ({ issueId, session = null }) => {
  await Promise.all([
    withOptionalSession(Evaluation.deleteMany({ issue: issueId }), session),
    withOptionalSession(Alternative.deleteMany({ issue: issueId }), session),
    withOptionalSession(Criterion.deleteMany({ issue: issueId }), session),
    withOptionalSession(Participation.deleteMany({ issue: issueId }), session),
    withOptionalSession(Consensus.deleteMany({ issue: issueId }), session),
    withOptionalSession(Notification.deleteMany({ issue: issueId }), session),
    withOptionalSession(
      IssueExpressionDomain.deleteMany({ issue: issueId }),
      session
    ),
    withOptionalSession(
      CriteriaWeightEvaluation.deleteMany({ issue: issueId }),
      session
    ),
    withOptionalSession(ExitUserIssue.deleteMany({ issue: issueId }), session),
    withOptionalSession(IssueScenario.deleteMany({ issue: issueId }), session),
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
