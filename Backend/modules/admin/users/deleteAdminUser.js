import { ExpressionDomain } from "../../../models/ExpressionDomain.js";
import { Issue } from "../../../models/Issues.js";
import { Notification } from "../../../models/Notifications.js";
import { Participation } from "../../../models/Participations.js";
import { User } from "../../../models/Users.js";

import {
  createBadRequestError,
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
    Issue.countDocuments({ admin: user._id }),
    session
  );

  if (ownedIssuesCount > 0) {
    throw createBadRequestError(
      "This user is creator/admin of one or more issues. Resolve those issues first before deleting the user.",
      { field: "targetUserId" }
    );
  }

  const participations = await applyOptionalSession(
    Participation.find({ expert: user._id }),
    session
  );

  const issueIds = [...new Set(participations.map((item) => toIdString(item.issue)))];

  const issues = issueIds.length
    ? await applyOptionalSession(Issue.find({ _id: { $in: issueIds } }), session)
    : [];

  const participationsByIssueId = new Map(
    participations.map((participation) => [toIdString(participation.issue), participation])
  );

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
