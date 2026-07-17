import { createBadRequestError } from "../../../utils/common/errors.js";
import {
  isValidObjectIdLike,
  runWithTransaction,
} from "../../../utils/common/mongoose.js";
import { deleteAdminUser } from "./deleteAdminUser.js";

export const deleteAdminUserWorkflow = async (
  { targetUserId, adminUserId, beforeSessionCleanup },
  {
    deleteUser = deleteAdminUser,
    isValidUserId = isValidObjectIdLike,
    runTransaction = runWithTransaction,
  } = {}
) => {
  if (!targetUserId || !isValidUserId(targetUserId)) {
    throw createBadRequestError("Valid user id is required", {
      field: "id",
    });
  }

  return runTransaction(async (session) => {
    const result = await deleteUser({
      targetUserId,
      adminUserId,
      session,
    });

    return {
      message: `User ${result.deletedUser.email} deleted successfully`,
      data: {
        deletedUser: result.deletedUser,
        summary: result.summary,
      },
    };
  }, { onSuccessBeforeCleanup: beforeSessionCleanup });
};
