import jwt from "jsonwebtoken"

// Función para generar un token de acceso.
export const generateToken = (uid, role = "user") => {
  const expiresIn = 60 * 15 // 15 min

  try {
    const token = jwt.sign({ uid, role }, process.env.JWT_SECRET, { expiresIn })
    return { token, expiresIn }
  } catch (err) {
    console.error(err)
    return { token: null, expiresIn: null }
  }
}

// Función para generar un token de refresco y configurarlo como cookie en la respuesta.
export const generateRefreshToken = (uid, res) => {
  const expiresIn = 60 * 60 * 24 * 30 // 30 días

  try {
    // refresh token solo con uid (no metemos role aquí)
    const refreshToken = jwt.sign({ uid }, process.env.JWT_REFRESH, { expiresIn })

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // ✅ en local no te rompe si vas por http
      sameSite: "strict",
      expires: new Date(Date.now() + expiresIn * 1000)
    })
  } catch (err) {
    console.error(err)
  }
}