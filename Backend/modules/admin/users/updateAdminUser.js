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

const requireStringForUpdateOrThrow = ({ value, field, message }) => {
  if (typeof value !== "string") {
    throw createBadRequestError(message, {
      field,
    });
  }

  return value.trim();
};

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
    const cleanName = requireStringForUpdateOrThrow({
      value: name,
      field: "name",
      message: "Name must be a string",
    });

    if (!cleanName) {
      throw createBadRequestError("Name can not be empty", {
        field: "name",
      });
    }

    user.name = cleanName;
  }

  if (university !== undefined) {
    const cleanUniversity = requireStringForUpdateOrThrow({
      value: university,
      field: "university",
      message: "University must be a string",
    });

    if (!cleanUniversity) {
      throw createBadRequestError("University can not be empty", {
        field: "university",
      });
    }

    user.university = cleanUniversity;
  }

  if (email !== undefined) {
    const cleanEmail = requireStringForUpdateOrThrow({
      value: email,
      field: "email",
      message: "Email must be a string",
    }).toLowerCase();

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
    if (typeof role !== "string") {
      throw createBadRequestError("Invalid role", {
        field: "role",
      });
    }

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

  if (password !== undefined) {
    const cleanPassword = requireStringForUpdateOrThrow({
      value: password,
      field: "password",
      message: "Password must be a string",
    });

    if (cleanPassword !== "") {
      if (cleanPassword.length < 6) {
        throw createBadRequestError("Password must be at least 6 characters", {
          field: "password",
        });
      }

      user.password = cleanPassword;
      user.markModified("password");
    }
  }

  await user.save({ session });

  return {
    message: `User ${user.email} updated successfully`,
    user: buildAdminManagedUserPayload(user),
  };
};
