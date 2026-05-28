import { createForbiddenError } from "../utils/common/errors.js";

export const requireAdmin = (req, res, next) => {
  const currentRole = req.role ?? "user";

  if (currentRole !== "admin") {
    return next(createForbiddenError("Admin only."));
  }

  return next();
};