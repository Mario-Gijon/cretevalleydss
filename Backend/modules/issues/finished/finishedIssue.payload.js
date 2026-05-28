import { Issue } from "../../../models/Issues.js";
import {
  buildPluginFinishedIssuePayload,
  supportsPluginFinishedIssuePayload,
} from "./finishedIssue.pluginPayload.js";

import {
  createBadRequestError,
  createInternalError,
  createNotFoundError,
} from "../../../utils/common/errors.js";
import { isValidObjectIdLike } from "../../../utils/common/mongoose.js";

export const getFinishedIssueInfoPayload = async ({ issueId }) => {
  if (!issueId || !isValidObjectIdLike(issueId)) {
    throw createBadRequestError("Valid issue id is required", {
      field: "issueId",
    });
  }

  const issue = await Issue.findById(issueId)
    .populate("model")
    .populate("admin", "email name")
    .lean();

  if (!issue) {
    throw createNotFoundError("Issue not found", {
      field: "issueId",
    });
  }

  if (!supportsPluginFinishedIssuePayload(issue)) {
    throw createInternalError(
      "Finished issue requires plugin evaluation payload support",
      {
        field: "alternativeEvaluationStructureKey",
        details: {
          issueId: issue._id.toString(),
        },
      }
    );
  }

  return buildPluginFinishedIssuePayload({ issue });
};