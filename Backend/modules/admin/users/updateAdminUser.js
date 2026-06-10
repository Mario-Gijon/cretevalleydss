import { User } from "../../../models/Users.js";

import {
  createBadRequestError,
  createConflictError,
  createNotFoundError,
} from "../../../utils/common/errors.js";
import { applyOptionalSession, isValidObjectIdLike } from "../../../utils/common/mongoose.js";
import {
  buildAdminManagedUserPayload,
  normalizeAdminManagedRole,
} from "./adminUserPayloads.js";

export const updateAdminUser = async ({
  payload,
  session = null,
}) => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw createBadRequestError("Request payload is required", {
      field: "payload",
    });
  }

  const {
    id,
    name,
    university,
    email,
    password,
    accountConfirm,
    role,
  } = payload;

  if (!id || !isValidObjectIdLike(id)) {
    throw createBadRequestError("Valid user id is required", {
      field: "id",
    });
  }

  const user = await applyOptionalSession(User.findById(id), session);

  if (!user) {
    throw createNotFoundError("User not found", {
      field: "id",
    });
  }

  if (name !== undefined) {
    const cleanName = String(name).trim();

    if (!cleanName) {
      throw createBadRequestError("Name can not be empty", {
        field: "name",
      });
    }

    user.name = cleanName;
  }

  if (university !== undefined) {
    const cleanUniversity = String(university).trim();

    if (!cleanUniversity) {
      throw createBadRequestError("University can not be empty", {
        field: "university",
      });
    }

    user.university = cleanUniversity;
  }

  if (email !== undefined) {
    const cleanEmail = String(email).trim().toLowerCase();

    if (!cleanEmail) {
      throw createBadRequestError("Email can not be empty", {
        field: "email",
      });
    }

    const emailInUse = await applyOptionalSession(
      User.findOne({
        email: cleanEmail,
        _id: { $ne: user._id },
      }).lean(),
      session
    );

    if (emailInUse) {
      throw createConflictError("Email already registered", {
        field: "email",
      });
    }

    user.email = cleanEmail;
  }

  if (role !== undefined) {
    const cleanRole = normalizeAdminManagedRole(role);

    if (!["user", "admin"].includes(cleanRole)) {
      throw createBadRequestError("Invalid role", {
        field: "role",
      });
    }

    user.role = cleanRole;
  }

  if (user.role === "admin") {
    user.accountConfirm = true;
  } else if (typeof accountConfirm === "boolean") {
    user.accountConfirm = accountConfirm;
  }

  if (password !== undefined && String(password).trim() !== "") {
    const cleanPassword = String(password).trim();

    if (cleanPassword.length < 6) {
      throw createBadRequestError("Password must be at least 6 characters", {
        field: "password",
      });
    }

    user.password = cleanPassword;
    user.markModified("password");
  }

  await user.save({ session });

  return {
    message: `User ${user.email} updated successfully`,
    user: buildAdminManagedUserPayload(user),
  };
};
