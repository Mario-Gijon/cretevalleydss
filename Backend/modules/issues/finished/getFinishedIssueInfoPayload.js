import {
  buildFinishedPayload,
  supportsFinishedPayload,
} from "./finishedPayload/index.js";
import {
  assertUserCanAccessIssue,
  getIssueByIdOrThrow,
} from "../shared/queries.js";

import {
  createInternalError,
} from "../../../utils/common/errors.js";

export const getFinishedIssueInfoPayload = async ({ issueId, userId }) => {
  const issue = await getIssueByIdOrThrow(issueId, {
    populate: [
      { path: "model" },
      { path: "ownerId", select: "email name" },
      { path: "createdBy", select: "email name" },
    ],
    lean: true,
  });

  await assertUserCanAccessIssue({
    issue,
    userId,
    message: "You are not allowed to access this finished issue",
  });

  if (!supportsFinishedPayload(issue)) {
    throw createInternalError(
      "Finished issue requires finished evaluation payload support",
      {
        field: "evaluationStructureKey",
        details: {
          issueId: issue._id.toString(),
        },
      }
    );
  }

  return buildFinishedPayload({ issue });
};
