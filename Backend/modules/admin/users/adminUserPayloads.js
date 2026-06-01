import { toIdString } from "../../../utils/common/ids.js";

export const normalizeAdminManagedRole = (role) =>
  String(role || "user").trim().toLowerCase();

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
  if (!user) {
    return null;
  }

  return {
    id: toIdString(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
  };
};
