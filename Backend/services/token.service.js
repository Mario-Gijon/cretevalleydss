import jwt from "jsonwebtoken";
import { createInternalError } from "../utils/common/errors.js";

const ACCESS_TOKEN_EXPIRES_IN_SECONDS = 60 * 15;
const REFRESH_TOKEN_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 30;
const REFRESH_TOKEN_COOKIE_NAME = "refreshToken";

/**
 * Genera un access token para un usuario.
 *
 * @param {string|Object} uid Id del usuario.
 * @param {string} [role="user"] Rol del usuario.
 * @returns {Object}
 */
export const generateToken = (uid, role = "user") => {
  try {
    const token = jwt.sign({ uid, role }, process.env.JWT_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRES_IN_SECONDS,
    });

    return {
      token,
      expiresIn: ACCESS_TOKEN_EXPIRES_IN_SECONDS,
    };
  } catch (error) {
    console.error("Failed to generate access token.", error);

    throw createInternalError("Failed to generate access token.", {
      expose: false,
      cause: error,
    });
  }
};

/**
 * Genera un refresh token y lo guarda en cookie.
 *
 * @param {string|Object} uid Id del usuario.
 * @param {Object} res Response de Express.
 * @returns {Object}
 */
export const generateRefreshToken = (uid, res) => {
  try {
    const refreshToken = jwt.sign({ uid }, process.env.JWT_REFRESH, {
      expiresIn: REFRESH_TOKEN_EXPIRES_IN_SECONDS,
    });

    res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      expires: new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN_SECONDS * 1000),
    });

    return {
      expiresIn: REFRESH_TOKEN_EXPIRES_IN_SECONDS,
    };
  } catch (error) {
    console.error("Failed to generate refresh token.", error);

    throw createInternalError("Failed to generate refresh token.", {
      expose: false,
      cause: error,
    });
  }
};