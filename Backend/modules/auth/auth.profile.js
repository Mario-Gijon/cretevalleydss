import { User } from "../../models/Users.js";
import {
  createBadRequestError,
  createNotFoundError,
} from "../../utils/common/errors.js";
import { applyOptionalSession } from "../../utils/common/mongoose.js";

const buildAuthenticatedUserProfilePayload = (user) => {
  const role = user.role;

  return {
    university: user.university,
    name: user.name,
    email: user.email,
    accountCreation: user.accountCreation,
    role,
    isAdmin: role === "admin",
  };
};

export const getAuthenticatedUserProfilePayload = async ({ userId }) => {
  const user = await User.findById(userId).lean();

  if (!user) {
    throw createNotFoundError("User not found", {
      field: "userId",
    });
  }

  return buildAuthenticatedUserProfilePayload(user);
};

export const updateAuthenticatedUserName = async ({
  userId,
  newName,
  session = null,
}) => {
  const cleanName = String(newName ?? "").trim();

  if (!cleanName) {
    throw createBadRequestError("Name is required", {
      field: "newName",
    });
  }

  const user = await applyOptionalSession(User.findById(userId), session);

  if (!user) {
    throw createNotFoundError("User not found", {
      field: "userId",
    });
  }

  user.name = cleanName;

  await user.save({ session });

  return {
    message: "Name updated successfully",
  };
};

export const updateAuthenticatedUserUniversity = async ({
  userId,
  newUniversity,
  session = null,
}) => {
  const cleanUniversity = String(newUniversity ?? "").trim();

  if (!cleanUniversity) {
    throw createBadRequestError("University is required", {
      field: "newUniversity",
    });
  }

  const user = await applyOptionalSession(User.findById(userId), session);

  if (!user) {
    throw createNotFoundError("User not found", {
      field: "userId",
    });
  }

  user.university = cleanUniversity;

  await user.save({ session });

  return {
    message: "University updated successfully",
  };
};

export const updateAuthenticatedUserPassword = async ({
  userId,
  newPassword,
  repeatNewPassword,
  session = null,
}) => {
  const cleanPassword = String(newPassword ?? "");
  const cleanRepeatPassword = String(repeatNewPassword ?? "");

  if (!cleanPassword.trim()) {
    throw createBadRequestError("New password is required", {
      field: "newPassword",
    });
  }

  if (cleanPassword.length < 6) {
    throw createBadRequestError("Password must be at least 6 characters", {
      field: "newPassword",
    });
  }

  if (cleanPassword !== cleanRepeatPassword) {
    throw createBadRequestError("Passwords do not match", {
      field: "repeatNewPassword",
    });
  }

  const user = await applyOptionalSession(User.findById(userId), session);

  if (!user) {
    throw createNotFoundError("User not found", {
      field: "userId",
    });
  }

  user.password = cleanPassword;
  user.markModified("password");

  await user.save({ session });

  return {
    message: "Password updated successfully",
  };
};
