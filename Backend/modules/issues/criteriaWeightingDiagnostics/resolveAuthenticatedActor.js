import mongoose from "mongoose";

import { User } from "../../../models/Users.js";
import { createUnauthorizedError } from "../../../utils/common/errors.js";
import { toIdString } from "../../../utils/common/ids.js";
import { normalizeNonEmptyString } from "../../../utils/common/strings.js";

export const resolveAuthenticatedDiagnosticActorOrThrow = async ({
  userId,
  fallbackName,
}) => {
  const id = toIdString(userId);
  if (!id || !mongoose.isValidObjectId(id)) {
    throw createUnauthorizedError("Authenticated user identity is required", {
      field: "userId",
    });
  }

  const user = await User.findOne({
    _id: userId,
    isDeleted: { $ne: true },
  })
    .select("_id name")
    .lean();

  if (!user) {
    throw createUnauthorizedError("Authenticated user is no longer available", {
      field: "userId",
    });
  }

  return {
    id: toIdString(user._id),
    name: normalizeNonEmptyString(user.name) || fallbackName,
  };
};
