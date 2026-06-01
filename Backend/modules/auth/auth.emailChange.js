import jwt from "jsonwebtoken";

import { User } from "../../models/Users.js";
import {
  createBadRequestError,
  createConflictError,
  createNotFoundError,
} from "../../utils/common/errors.js";
import { applyOptionalSession } from "../../utils/common/mongoose.js";



export const requestAuthenticatedUserEmailChangeFlow = async ({
  userId,
  newEmail,
  session = null,
}) => {
  const cleanEmail = String(newEmail ?? "").trim().toLowerCase();

  if (!cleanEmail) {
    throw createBadRequestError("New email is required", {
      field: "newEmail",
    });
  }

  const user = await applyOptionalSession(User.findById(userId), session);

  if (!user) {
    throw createNotFoundError("User not found", {
      field: "userId",
    });
  }

  const currentEmail = user.email.trim().toLowerCase();

  if (currentEmail === cleanEmail) {
    throw createBadRequestError(
      "New email must be different from the current email",
      {
        field: "newEmail",
      }
    );
  }

  const existingUser = await applyOptionalSession(
    User.findOne({ email: cleanEmail }).select("_id").lean(),
    session
  );

  if (existingUser && existingUser._id.toString() !== user._id.toString()) {
    throw createConflictError("Email already registered", {
      field: "newEmail",
    });
  }

  const emailToken = jwt.sign({ newEmail: cleanEmail }, process.env.JWT_SECRET);

  user.emailTokenConfirm = emailToken;
  await user.save({ session });

  return {
    message: "Please, check new email for confirmation",
    emailChangeConfirmation: {
      newEmail: cleanEmail,
      token: emailToken,
    },
  };
};

export const confirmAuthenticatedUserEmailChangeFlow = async ({
  token,
  session = null,
}) => {
  const cleanToken = String(token ?? "").trim();

  if (!cleanToken) {
    throw createBadRequestError("Token is required", {
      field: "token",
    });
  }

  const user = await applyOptionalSession(
    User.findOne({ emailTokenConfirm: cleanToken }),
    session
  );

  if (!user) {
    throw createNotFoundError("Email change confirmation not found", {
      field: "token",
    });
  }

  let decoded = null;

  try {
    decoded = jwt.verify(cleanToken, process.env.JWT_SECRET);
  } catch (error) {
    throw createBadRequestError("Invalid email change token", {
      field: "token",
      cause: error,
    });
  }

  const newEmail = String(decoded?.newEmail ?? "").trim().toLowerCase();

  if (!newEmail) {
    throw createBadRequestError("Invalid email change token", {
      field: "token",
    });
  }

  const existingUser = await applyOptionalSession(
    User.findOne({ email: newEmail }).select("_id").lean(),
    session
  );

  if (existingUser && existingUser._id.toString() !== user._id.toString()) {
    throw createConflictError("Email already registered", {
      field: "email",
    });
  }

  user.email = newEmail;
  user.emailTokenConfirm = null;

  await user.save({ session });

  return {
    message: "Email changed successfully",
  };
};
