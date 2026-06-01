import { Issue } from "../../../models/Issues.js";
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
import { buildAdminUserIdentityPayload } from "./adminUserPayloads.js";

export const reassignIssueAdmin = async ({
  issueId,
  newAdminId,
  session = null,
}) => {
  if (!issueId || !isValidObjectIdLike(issueId)) {
    throw createBadRequestError("Valid issueId is required", {
      field: "issueId",
    });
  }

  if (!newAdminId || !isValidObjectIdLike(newAdminId)) {
    throw createBadRequestError("Valid newAdminId is required", {
      field: "newAdminId",
    });
  }

  const [issue, newAdmin] = await Promise.all([
    applyOptionalSession(
      Issue.findById(issueId).populate("admin", "name email role"),
      session
    ),
    applyOptionalSession(
      User.findById(newAdminId).select("name email role accountConfirm"),
      session
    ),
  ]);

  if (!issue) {
    throw createNotFoundError("Issue not found", {
      field: "issueId",
    });
  }

  if (!newAdmin) {
    throw createNotFoundError("Target user not found", {
      field: "newAdminId",
    });
  }

  if (!newAdmin.accountConfirm) {
    throw createBadRequestError("Target user account is not confirmed", {
      field: "newAdminId",
    });
  }

  const oldAdmin = buildAdminUserIdentityPayload(issue.admin);
  const nextAdmin = buildAdminUserIdentityPayload(newAdmin);

  if (sameId(issue.admin?._id || issue.admin, newAdmin._id)) {
    return {
      message: `Issue ${issue.name} is already assigned to ${newAdmin.email}`,
      issue: {
        id: toIdString(issue._id),
        name: issue.name,
      },
      admin: {
        oldAdmin,
        newAdmin: nextAdmin,
      },
    };
  }

  issue.admin = newAdmin._id;
  await issue.save({ session });

  return {
    message: `Issue ${issue.name} reassigned to ${newAdmin.email} successfully`,
    issue: {
      id: toIdString(issue._id),
      name: issue.name,
    },
    admin: {
      oldAdmin,
      newAdmin: nextAdmin,
    },
  };
};
