import jwt from "jsonwebtoken";

/**
 * Genera un access token para un usuario.
 *
 * @param {string|Object} uid Id del usuario.
 * @param {string} [role="user"] Rol del usuario.
 * @returns {{ token: string|null, expiresIn: number|null }}
 */
export const generateToken = (uid, role = "user") => {
  const expiresIn = 60 * 15;

  try {
    const token = jwt.sign({ uid, role }, process.env.JWT_SECRET, { expiresIn });
    return { token, expiresIn };
  } catch (err) {
    console.error(err);
    return { token: null, expiresIn: null };
  }
};

/**
 * Genera un refresh token y lo guarda en cookie.
 *
 * @param {string|Object} uid Id del usuario.
 * @param {import("express").Response} res Response de Express.
 * @returns {void}
 */
export const generateRefreshToken = (uid, res) => {
  const expiresIn = 60 * 60 * 24 * 30;

  try {
    const refreshToken = jwt.sign({ uid }, process.env.JWT_REFRESH, { expiresIn });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      expires: new Date(Date.now() + expiresIn * 1000),
    });
  } catch (err) {
    console.error(err);
  }
};