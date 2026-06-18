import { ExpressionDomain } from "../../../models/ExpressionDomain.js";
import { Issue } from "../../../models/Issues.js";
import { Notification } from "../../../models/Notifications.js";
import { Participation } from "../../../models/Participations.js";
import { User } from "../../../models/Users.js";

import {
  createBadRequestError,
  createInternalError,
  createNotFoundError,
} from "../../../utils/common/errors.js";
import { sameId, toIdString } from "../../../utils/common/ids.js";
import {
  applyOptionalSession,
  isValidObjectIdLike,
} from "../../../utils/common/mongoose.js";
import { removeDeletedUserFromIssues } from "./removeDeletedUserFromIssues.js";

export const deleteAdminUser = async ({
  targetUserId,
  adminUserId,
  session = null,
}) => {
  if (!targetUserId || !isValidObjectIdLike(targetUserId)) {
    throw createBadRequestError("User id is required", {
      field: "targetUserId",
    });
  }

  const user = await applyOptionalSession(User.findById(targetUserId), session);

  if (!user) {
    throw createNotFoundError("User not found", {
      field: "id",
    });
  }

  if (sameId(adminUserId, user._id)) {
    throw createBadRequestError(
      "You cannot delete your own account from this admin panel",
      { field: "targetUserId" }
    );
  }

  const ownedIssuesCount = await applyOptionalSession(
    Issue.countDocuments({ ownerId: user._id }),
    session
  );

  if (ownedIssuesCount > 0) {
    throw createBadRequestError(
      "This user is owner of one or more issues. Resolve those issues first before deleting the user.",
      { field: "targetUserId" }
    );
  }

  const participations = await applyOptionalSession(
    Participation.find({ expert: user._id }),
    session
  );

  const issueIds = [];
  const seenIssueIds = new Set();
  const participationsByIssueId = new Map();

  for (const participation of participations) {
    const issueId = toIdString(participation.issue);

    if (!issueId) {
      throw createInternalError("Participation issue id is invalid", {
        field: "participations.issue",
        details: {
          participationId: toIdString(participation._id) || null,
          userId: toIdString(user._id),
        },
      });
    }

    if (participationsByIssueId.has(issueId)) {
      throw createInternalError(
        "Duplicate participation found for issue while deleting admin user",
        {
          field: "participations.issue",
          details: {
            issueId,
            userId: toIdString(user._id),
          },
        }
      );
    }

    participationsByIssueId.set(issueId, participation);

    if (!seenIssueIds.has(issueId)) {
      seenIssueIds.add(issueId);
      issueIds.push(issueId);
    }
  }

  const issues = issueIds.length
    ? await applyOptionalSession(Issue.find({ _id: { $in: issueIds } }), session)
    : [];

  if (issues.length !== issueIds.length) {
    const foundIssueIds = new Set(issues.map((issue) => toIdString(issue._id)));
    const missingIssueId = issueIds.find((issueId) => !foundIssueIds.has(issueId));

    throw createInternalError(
      "Participation references an issue that was not found while deleting admin user",
      {
        field: "participations.issue",
        details: {
          issueId: missingIssueId || null,
          userId: toIdString(user._id),
        },
      }
    );
  }

  const summary = {
    activeIssuesUpdated: 0,
    activeIssuesDeleted: 0,
    finishedIssuesHidden: 0,
    finishedIssuesDeleted: 0,
    activeIssueEvaluationsDeleted: 0,
    domainsDeleted: 0,
  };

  await removeDeletedUserFromIssues({
    issues,
    participationsByIssueId,
    user,
    summary,
    session,
  });

  const deleteDomainsResult = await applyOptionalSession(
    ExpressionDomain.deleteMany({
      user: user._id,
      isGlobal: false,
    }),
    session
  );

  if (typeof deleteDomainsResult.deletedCount !== "number") {
    throw createInternalError("ExpressionDomain deleteMany result is invalid", {
      field: "deletedCount",
      details: {
        userId: toIdString(user._id),
      },
    });
  }

  summary.domainsDeleted = deleteDomainsResult.deletedCount;

  await applyOptionalSession(
    Notification.deleteMany({
      expert: user._id,
    }),
    session
  );

  await applyOptionalSession(
    User.deleteOne({
      _id: user._id,
    }),
    session
  );

  return {
    deletedUser: {
      id: toIdString(user._id),
      email: user.email,
    },
    summary,
  };
};
