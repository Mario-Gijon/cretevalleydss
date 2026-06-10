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
    getIssueByIdOrThrow(issueId, {
      populate: {
        path: "admin",
        select: "name email role",
      },
      lean: false,
      session,
    }),
    applyOptionalSession(
      User.findById(newAdminId).select("name email role accountConfirm"),
      session
    ),
  ]);

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

  if (!issue.admin || typeof issue.admin !== "object") {
    throw createInternalError("Issue admin must be populated for reassignment", {
      field: "issue.admin",
      details: {
        issueId: toIdString(issue._id),
      },
    });
  }

  const oldAdmin = buildAdminUserIdentityPayload(issue.admin);
  const nextAdmin = buildAdminUserIdentityPayload(newAdmin);

  if (sameId(issue.admin._id, newAdmin._id)) {
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
