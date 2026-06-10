import { createInternalError } from "../../../utils/common/errors.js";
import { toIdString } from "../../../utils/common/ids.js";

export const normalizeAdminManagedRole = (role) => {
  if (role === undefined || role === null) {
    return "user";
  }

  if (typeof role !== "string") {
    return null;
  }

  return role.trim().toLowerCase();
};

export const buildAdminManagedUserPayload = (user) => ({
  id: toIdString(user._id),
  name: user.name,
  university: user.university,
  email: user.email,
  role: user.role,
  accountConfirm: user.accountConfirm,
  accountCreation: user.accountCreation,
});

export const buildAdminUserIdentityPayload = (user) => {
  if (!user || typeof user !== "object") {
    throw createInternalError("Admin user identity source is invalid", {
      field: "user",
    });
  }

  const id = toIdString(user._id);
  const name = typeof user.name === "string" ? user.name.trim() : "";
  const email = typeof user.email === "string" ? user.email.trim() : "";
  const role = typeof user.role === "string" ? user.role.trim() : "";

  if (!id || !name || !email || !role) {
    throw createInternalError("Admin user identity data is invalid", {
      field: "user",
      details: {
        userId: id || null,
      },
    });
  }

  return {
    id,
    name,
    email,
    role,
  };
};
