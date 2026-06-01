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

export const createAdminUser = async ({
  payload,
  session = null,
}) => {
  let {
    name = "",
    university = "",
    email = "",
    password = "",
    accountConfirm = true,
    role = "user",
  } = payload || {};

  name = String(name).trim();
  university = String(university).trim();
  email = String(email).trim().toLowerCase();
  password = String(password).trim();
  role = normalizeAdminManagedRole(role);

  if (!name) {
    throw createBadRequestError("Name is required", {
      field: "name",
    });
  }

  if (!university) {
    throw createBadRequestError("University is required", {
      field: "university",
    });
  }

  if (!email) {
    throw createBadRequestError("Email is required", {
      field: "email",
    });
  }

  if (!password) {
    throw createBadRequestError("Password is required", {
      field: "password",
    });
  }

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

  const finalAccountConfirm =
    role === "admin" ? true : Boolean(accountConfirm);

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
