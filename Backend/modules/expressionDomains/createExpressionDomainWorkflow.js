import { createConflictError } from "../../utils/common/errors.js";
import { createUserExpressionDomain } from "./createExpressionDomain.js";

export const createExpressionDomainWorkflow = async ({ userId, payload }) => {
  try {
    return await createUserExpressionDomain({ userId, payload });
  } catch (error) {
    if (error?.code === 11000) {
      throw createConflictError(
        "A domain with the same name already exists (for this user).",
        {
          field: "name",
          details: error?.keyValue ?? null,
          cause: error,
        }
      );
    }

    throw error;
  }
};
