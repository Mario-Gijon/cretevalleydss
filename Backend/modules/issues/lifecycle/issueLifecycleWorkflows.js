import { runWithTransaction } from "../../../utils/common/mongoose.js";
import { deleteActiveIssueAsOwner } from "./deleteActiveIssue.js";
import { hideFinishedIssueForUser } from "./hideFinishedIssue.js";
import { leaveActiveIssue } from "./leaveActiveIssue.js";

export const deleteActiveIssueWorkflow = ({
  issueId,
  userId,
  beforeSessionCleanup,
}) =>
  runWithTransaction(
    (session) => deleteActiveIssueAsOwner({ issueId, userId, session }),
    { onSuccessBeforeCleanup: beforeSessionCleanup }
  );

export const hideFinishedIssueWorkflow = ({
  issueId,
  userId,
  beforeSessionCleanup,
}) =>
  runWithTransaction(
    (session) => hideFinishedIssueForUser({ issueId, userId, session }),
    { onSuccessBeforeCleanup: beforeSessionCleanup }
  );

export const leaveActiveIssueWorkflow = ({
  issueId,
  userId,
  beforeSessionCleanup,
}) =>
  runWithTransaction(
    (session) => leaveActiveIssue({ issueId, userId, session }),
    { onSuccessBeforeCleanup: beforeSessionCleanup }
  );
