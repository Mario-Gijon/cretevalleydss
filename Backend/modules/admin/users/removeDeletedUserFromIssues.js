import {
  hideFinishedIssueForDeletedUser,
  removeIssueParticipantFromActiveIssue,
} from "../../issues/lifecycle/index.js";

import { createInternalError } from "../../../utils/common/errors.js";
import { toIdString } from "../../../utils/common/ids.js";

const ACCOUNT_DELETED_BY_ADMIN_REASON = "Expert account deleted by admin";

export const removeDeletedUserFromIssues = async ({
  issues,
  participationsByIssueId,
  user,
  summary,
  session = null,
}) => {
  for (const issue of issues) {
    const issueId = toIdString(issue._id);
    const participation = participationsByIssueId.get(issueId);

    if (!participation) {
      throw createInternalError(
        "Issue participation is missing while deleting admin user",
        {
          field: "participations.issue",
          details: {
            issueId,
            userId: toIdString(user._id),
          },
        }
      );
    }

    if (issue.active) {
      const removeActiveResult = await removeIssueParticipantFromActiveIssue({
        issue,
        participation,
        userId: user._id,
        reason: ACCOUNT_DELETED_BY_ADMIN_REASON,
        session,
      });

      summary.activeIssueEvaluationsDeleted +=
        removeActiveResult.evaluationsDeletedCount;

      if (removeActiveResult.issueDeleted) {
        summary.activeIssuesDeleted += 1;
      } else if (removeActiveResult.issueUpdated) {
        summary.activeIssuesUpdated += 1;
      }
      continue;
    }

    const hideFinishedResult = await hideFinishedIssueForDeletedUser({
      issue,
      userId: user._id,
      reason: ACCOUNT_DELETED_BY_ADMIN_REASON,
      session,
    });

    if (hideFinishedResult.hidden) {
      summary.finishedIssuesHidden += 1;
    }

    if (hideFinishedResult.deletedPermanently) {
      summary.finishedIssuesDeleted += 1;
    }
  }
};
