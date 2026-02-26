import jwt from "jsonwebtoken"

export const requireToken = (req, res, next) => {
  try {
    const authHeader = req.headers?.authorization

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ msg: "Token does not exist", success: false })
    }

    const token = authHeader.split(" ")[1]
    if (!token) {
      return res.status(401).json({ msg: "Token does not exist", success: false })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    req.uid = decoded.uid
    req.role = decoded.role ?? "user" // ✅ fallback por si hay tokens antiguos

    next()
  } catch (err) {
    console.error(err)
    return res.status(401).json({ msg: "Invalid token", success: false })
  }
}