import { getIssueByIdOrThrow } from "../shared/queries.js";
import { deleteIssueCascade } from "./deleteIssueCascade.js";

import {
  createBadRequestError,
  createForbiddenError,
} from "../../../utils/common/errors.js";
import { sameId } from "../../../utils/common/ids.js";

export const deleteActiveIssueAsOwner = async ({
  issueId,
  userId,
  session = null,
}) => {
  const issue = await getIssueByIdOrThrow(issueId, { lean: false, session });

  if (!sameId(issue.ownerId, userId)) {
    throw createForbiddenError("You are not the owner of this issue");
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
