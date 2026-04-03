import jwt from "jsonwebtoken";

const REFRESH_TOKEN_COOKIE_NAME = "refreshToken";

/**
 * Extrae el refresh token desde las cookies del request.
 *
 * @param {import("express").Request} req Request de Express.
 * @returns {string | null}
 */
const getRefreshTokenFromCookies = (req) => {
  return req.cookies?.[REFRESH_TOKEN_COOKIE_NAME] ?? null;
};

/**
 * Verifica el refresh token enviado en cookies y añade el uid al request.
 *
 * @type {import("express").RequestHandler}
 */
export const requireRefreshToken = (req, res, next) => {
  try {
    const refreshTokenCookie = getRefreshTokenFromCookies(req);

    if (!refreshTokenCookie) {
      return res.status(401).json({ msg: "Token does not exist", success: false });
    }

    const { uid } = jwt.verify(refreshTokenCookie, process.env.JWT_REFRESH);
    req.uid = uid;

    return next();
  } catch (error) {
    console.error(error);
    return res.status(401).json({ msg: "Invalid refresh token", success: false });
  }
};