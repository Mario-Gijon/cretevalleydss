import { ExpressionDomain } from "../../models/ExpressionDomain.js";
import { ExitUserIssue } from "../../models/ExitUserIssue.js";
import { IssueEvaluation } from "../../models/IssueEvaluations.js";
import { IssueScenario } from "../../models/IssueScenarios.js";
import { Issue } from "../../models/Issues.js";
import { Notification } from "../../models/Notifications.js";
import { Participation } from "../../models/Participations.js";
import { User } from "../../models/Users.js";
import { applyOptionalSession } from "../../utils/common/mongoose.js";

const DELETED_EMAIL_DOMAIN = "deleted.local";

export const buildDeletedUserEmail = (userId) =>
  `deleted-user-${String(userId).trim()}@${DELETED_EMAIL_DOMAIN}`;

const countDocuments = async (Model, filter, session = null) => {
  const query = Model.countDocuments(filter);
  if (session) {
    query.session(session);
  }

  return query;
};

export const getDeletedUserReferenceCounts = async ({
  userId,
  session = null,
}) => {
  const [
    ownedIssues,
    createdIssues,
    participations,
    notifications,
    evaluations,
    exitLogs,
    expressionDomains,
    issueScenarios,
  ] = await Promise.all([
    countDocuments(Issue, { ownerId: userId }, session),
    countDocuments(Issue, { createdBy: userId }, session),
    countDocuments(Participation, { expert: userId }, session),
    countDocuments(Notification, { expert: userId }, session),
    countDocuments(IssueEvaluation, { expert: userId }, session),
    countDocuments(ExitUserIssue, { user: userId }, session),
    countDocuments(ExpressionDomain, { user: userId }, session),
    countDocuments(IssueScenario, { createdBy: userId }, session),
  ]);

  return {
    ownedIssues,
    createdIssues,
    participations,
    notifications,
    evaluations,
    exitLogs,
    expressionDomains,
    issueScenarios,
  };
};

const hasRemainingReferences = (referenceCounts) =>
  Object.values(referenceCounts).some((count) => count > 0);

export const purgeDeletedUserIfUnreferenced = async ({
  userId,
  session = null,
}) => {
  const user = await applyOptionalSession(User.findById(userId), session);

  if (!user) {
    return {
      purged: false,
      missingUser: true,
    };
  }

  if (user.isDeleted !== true) {
    return {
      purged: false,
      skipped: "user-not-deleted",
    };
  }

  const referenceCounts = await getDeletedUserReferenceCounts({
    userId,
    session,
  });

  if (hasRemainingReferences(referenceCounts)) {
    return {
      purged: false,
      referencesRemaining: true,
      referenceCounts,
    };
  }

  await applyOptionalSession(User.deleteOne({ _id: user._id }), session);

  return {
    purged: true,
    referenceCounts,
  };
};
