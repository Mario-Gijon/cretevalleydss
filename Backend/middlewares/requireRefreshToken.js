import jwt from "jsonwebtoken";
import { createUnauthorizedError } from "../utils/common/errors.js";

const REFRESH_TOKEN_COOKIE_NAME = "refreshToken";

const getRefreshTokenFromCookies = (req) => {
  return req.cookies?.[REFRESH_TOKEN_COOKIE_NAME] ?? null;
};

export const requireRefreshToken = (req, res, next) => {
  try {
    const refreshTokenCookie = getRefreshTokenFromCookies(req);

    if (!refreshTokenCookie) {
      return next(
        createUnauthorizedError("Token does not exist.", {
          code: "NO_REFRESH_TOKEN",
        })
      );
    }

    const { uid } = jwt.verify(refreshTokenCookie, process.env.JWT_REFRESH);
    req.uid = uid;

    return next();
  } catch (error) {
    return next(
      createUnauthorizedError("Invalid refresh token.", {
        code: "REFRESH_TOKEN_INVALID",
        cause: error,
      })
    );
  }
};