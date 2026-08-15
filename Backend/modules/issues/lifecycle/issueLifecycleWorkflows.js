import { runWithTransaction } from "../../../utils/common/mongoose.js";
import { deleteActiveIssueAsOwner } from "./deleteActiveIssue.js";
import { hideFinishedIssueForUser } from "./hideFinishedIssue.js";
import { leaveActiveIssue } from "./leaveActiveIssue.js";
import { createIssueEventOperationMetadata } from "../events/index.js";

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
}) => {
  const eventMetadata = createIssueEventOperationMetadata();

  return runWithTransaction(
    (session) => leaveActiveIssue({ issueId, userId, ...eventMetadata, session }),
    { onSuccessBeforeCleanup: beforeSessionCleanup }
  );
};
