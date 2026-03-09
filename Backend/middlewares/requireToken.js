import jwt from "jsonwebtoken"

export const requireToken = (req, res, next) => {
  try {
    const authHeader = req.headers?.authorization

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ msg: "Token does not exist", success: false, code: "NO_TOKEN" })
    }

    const token = authHeader.split(" ")[1]
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    req.uid = decoded.uid
    req.role = decoded.role ?? "user"
    next()
  } catch (err) {
    // ✅ clave: distinguir expiración
    if (err?.name === "TokenExpiredError") {
      return res.status(401).json({ msg: "Token expired", success: false, code: "TOKEN_EXPIRED" })
    }
    return res.status(401).json({ msg: "Invalid token", success: false, code: "TOKEN_INVALID" })
  }
}