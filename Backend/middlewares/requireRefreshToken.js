import jwt from "jsonwebtoken";

/**
 * Verifica el refresh token enviado en cookies y añade el uid al request.
 *
 * @type {import("express").RequestHandler}
 */
export const requireRefreshToken = (req, res, next) => {
  try {
    const refreshTokenCookie = req.cookies?.refreshToken;

    if (!refreshTokenCookie) {
      return res.status(401).json({ msg: "Token does not exist", success: false });
    }

    const { uid } = jwt.verify(refreshTokenCookie, process.env.JWT_REFRESH);
    req.uid = uid;

    next();
  } catch (err) {
    console.error(err);
    return res.status(401).json({ msg: "Invalid refresh token", success: false });
  }
};