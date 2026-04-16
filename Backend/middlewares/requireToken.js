import jwt from "jsonwebtoken";
import { createUnauthorizedError } from "../utils/common/errors.js";

const BEARER_PREFIX = "Bearer ";

/**
 * Extrae el token Bearer de la cabecera Authorization.
 *
 * @param {?string} authorizationHeader Cabecera Authorization.
 * @returns {string|null}
 */
const getBearerTokenFromHeader = (authorizationHeader) => {
  if (!authorizationHeader || !authorizationHeader.startsWith(BEARER_PREFIX)) {
    return null;
  }

  return authorizationHeader.slice(BEARER_PREFIX.length).trim() || null;
};

/**
 * Verifica el access token enviado en la cabecera Authorization.
 *
 * @param {Object} req Request de Express.
 * @param {Object} res Response de Express.
 * @param {Function} next Siguiente middleware.
 * @returns {void}
 */
export const requireToken = (req, res, next) => {
  try {
    const token = getBearerTokenFromHeader(req.headers?.authorization);

    if (!token) {
      return next(
        createUnauthorizedError("Token does not exist.", {
          code: "NO_TOKEN",
        })
      );
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.uid = decoded.uid;
    req.role = decoded.role ?? "user";

    return next();
  } catch (error) {
    if (error?.name === "TokenExpiredError") {
      return next(
        createUnauthorizedError("Token expired.", {
          code: "TOKEN_EXPIRED",
          cause: error,
        })
      );
    }

    return next(
      createUnauthorizedError("Invalid token.", {
        code: "TOKEN_INVALID",
        cause: error,
      })
    );
  }
};