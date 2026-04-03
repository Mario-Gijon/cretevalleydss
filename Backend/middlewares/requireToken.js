import jwt from "jsonwebtoken";

const BEARER_PREFIX = "Bearer ";

/**
 * Extrae el token Bearer de la cabecera Authorization.
 *
 * @param {string | undefined} authorizationHeader Cabecera Authorization.
 * @returns {string | null}
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
 * @type {import("express").RequestHandler}
 */
export const requireToken = (req, res, next) => {
  try {
    const token = getBearerTokenFromHeader(req.headers?.authorization);

    if (!token) {
      return res.status(401).json({
        msg: "Token does not exist",
        success: false,
        code: "NO_TOKEN",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.uid = decoded.uid;
    req.role = decoded.role ?? "user";

    return next();
  } catch (error) {
    if (error?.name === "TokenExpiredError") {
      return res.status(401).json({
        msg: "Token expired",
        success: false,
        code: "TOKEN_EXPIRED",
      });
    }

    return res.status(401).json({
      msg: "Invalid token",
      success: false,
      code: "TOKEN_INVALID",
    });
  }
};