import { User } from "../../models/Users.js";
import { generateToken } from "../../services/token.service.js";
import { createBadRequestError } from "../../utils/common/errors.js";


const createLoginFieldError = (field, message) =>
  createBadRequestError(message, { field });

export const loginUser = async ({ email, password }) => {
  const cleanEmail = String(email ?? "").trim().toLowerCase();
  const rawPassword = String(password ?? "");

  if (!cleanEmail) {
    throw createLoginFieldError("email", "Email is required");
  }

  if (!rawPassword) {
    throw createLoginFieldError("password", "Password is required");
  }

  const user = await User.findOne({ email: cleanEmail });

  if (!user) {
    throw createLoginFieldError("email", "User does not exist");
  }

  if (!user.accountConfirm) {
    throw createLoginFieldError("email", "Email not verified");
  }

  const isValidPassword = await user.comparePassword(rawPassword);

  if (!isValidPassword) {
    throw createLoginFieldError("password", "Incorrect password");
  }

  const role = user.role ?? "user";
  const { token, expiresIn } = generateToken(user._id, role);

  return {
    userId: user._id,
    message: "Login successful",
    token,
    expiresIn,
    role,
    isAdmin: role === "admin",
  };
};
