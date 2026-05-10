import { Issue } from "../../../models/Issues.js";

import {
  createBadRequestError,
  createNotFoundError,
} from "../../../utils/common/errors.js";
import { isValidObjectIdLike } from "../../../utils/common/mongoose.js";

export const withOptionalSession = (query, session = null) =>
  session ? query.session(session) : query;

export const getIssueOrThrow = async ({ issueId, session = null }) => {
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
