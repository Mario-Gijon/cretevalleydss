import { User } from "../../../models/Users.js";

import {
  createBadRequestError,
  createConflictError,
} from "../../../utils/common/errors.js";
import { applyOptionalSession } from "../../../utils/common/mongoose.js";
import {
  buildAdminManagedUserPayload,
  normalizeAdminManagedRole,
} from "./adminUserPayloads.js";

const normalizeRequiredStringOrThrow = ({ value, field, message, lower = false }) => {
  if (typeof value !== "string") {
    throw createBadRequestError(message, {
      field,
    });
  }

  const normalizedValue = lower ? value.trim().toLowerCase() : value.trim();

  if (!normalizedValue) {
    throw createBadRequestError(message, {
      field,
    });
  }

  return normalizedValue;
};

export const createAdminUser = async ({
  payload,
  session = null,
}) => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw createBadRequestError("Request payload is required", {
      field: "payload",
    });
  }

  let {
    name = "",
    university = "",
    email = "",
    password = "",
    accountConfirm = true,
    role,
  } = payload;

  name = normalizeRequiredStringOrThrow({
    value: name,
    field: "name",
    message: "Name is required",
  });
  university = normalizeRequiredStringOrThrow({
    value: university,
    field: "university",
    message: "University is required",
  });
  email = normalizeRequiredStringOrThrow({
    value: email,
    field: "email",
    message: "Email is required",
    lower: true,
  });
  password = normalizeRequiredStringOrThrow({
    value: password,
    field: "password",
    message: "Password is required",
  });
  role = normalizeAdminManagedRole(role);

  if (password.length < 6) {
    throw createBadRequestError("Password must be at least 6 characters", {
      field: "password",
    });
  }

  if (!["user", "admin"].includes(role)) {
    throw createBadRequestError("Invalid role", {
      field: "role",
    });
  }

  const existingUser = await applyOptionalSession(
    User.findOne({ email }).lean(),
    session
  );

  if (existingUser) {
    throw createConflictError("Email already registered", {
      field: "email",
    });
  }

  if (role !== "admin" && typeof accountConfirm !== "boolean") {
    throw createBadRequestError("accountConfirm must be boolean", {
      field: "accountConfirm",
    });
  }

  const finalAccountConfirm = role === "admin" ? true : accountConfirm;

  const newUser = new User({
    name,
    university,
    email,
    password,
    role,
    accountConfirm: finalAccountConfirm,
    tokenConfirm: null,
    emailTokenConfirm: null,
  });

  await newUser.save({ session });

  return {
    message: `${role === "admin" ? "Admin" : "User"} ${newUser.email} created successfully`,
    user: buildAdminManagedUserPayload(newUser),
  };
};
