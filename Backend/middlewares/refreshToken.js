import { User } from "../models/Users.js";
import { generateToken } from "../services/token.service.js";
import {
  createInternalError,
  createUnauthorizedError,
} from "../utils/common/errors.js";
import { sendSuccess } from "../utils/common/responses.js";

/**
 * Genera un nuevo access token a partir del refresh token validado.
 *
 * @param {Object} req Request de Express.
 * @param {Object} res Response de Express.
 * @param {Function} next Siguiente middleware.
 * @returns {Promise<Object|void>}
 */
export const refreshToken = async (req, res, next) => {
  try {
    const user = await User.findById(req.uid).select("role").lean();

    if (!user) {
      return next(createUnauthorizedError("User not found."));
    }

    const role = user.role ?? "user";
    const { token, expiresIn } = generateToken(req.uid, role);

    return sendSuccess(
      res,
      "Access token refreshed successfully.",
      {
        token,
        expiresIn,
      }
    );
  } catch (error) {
    return next(
      createInternalError("Refresh token failed.", {
        expose: false,
        cause: error,
      })
    );
  }
};