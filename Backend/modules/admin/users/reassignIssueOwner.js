import { User } from "../../../models/Users.js";
import { getIssueByIdOrThrow } from "../../issues/shared/queries.js";

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
import { buildAdminUserIdentityPayload } from "./adminUserPayloads.js";

export const reassignIssueOwner = async ({
  issueId,
  newOwnerId,
  session = null,
}) => {
  if (!issueId || !isValidObjectIdLike(issueId)) {
    throw createBadRequestError("Valid issueId is required", {
      field: "issueId",
    });
  }

  if (!newOwnerId || !isValidObjectIdLike(newOwnerId)) {
    throw createBadRequestError("Valid newOwnerId is required", {
      field: "newOwnerId",
    });
  }

  const [issue, newOwner] = await Promise.all([
    getIssueByIdOrThrow(issueId, {
      populate: {
        path: "ownerId",
        select: "name email role",
      },
      lean: false,
      session,
    }),
    applyOptionalSession(
      User.findById(newOwnerId).select("name email role accountConfirm"),
      session
    ),
  ]);

  if (!newOwner) {
    throw createNotFoundError("Target user not found", {
      field: "newOwnerId",
    });
  }

  if (!newOwner.accountConfirm) {
    throw createBadRequestError("Target user account is not confirmed", {
      field: "newOwnerId",
    });
  }

  if (!issue.ownerId || typeof issue.ownerId !== "object") {
    throw createInternalError("Issue owner must be populated for reassignment", {
      field: "issue.ownerId",
      details: {
        issueId: toIdString(issue._id),
      },
    });
  }

  const oldOwner = buildAdminUserIdentityPayload(issue.ownerId);
  const nextOwner = buildAdminUserIdentityPayload(newOwner);

  if (sameId(issue.ownerId._id, newOwner._id)) {
    return {
      message: `Issue ${issue.name} is already assigned to ${newOwner.email}`,
      issue: {
        id: toIdString(issue._id),
        name: issue.name,
      },
      owner: {
        oldOwner,
        newOwner: nextOwner,
      },
    };
  }

  issue.ownerId = newOwner._id;
  await issue.save({ session });

  return {
    message: `Issue ${issue.name} reassigned to ${newOwner.email} successfully`,
    issue: {
      id: toIdString(issue._id),
      name: issue.name,
    },
    owner: {
      oldOwner,
      newOwner: nextOwner,
    },
  };
};
