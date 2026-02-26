import { User } from "../models/Users.js"
import { generateToken } from "../utils/tokenManager.js"

export const refreshToken = async (req, res) => {
  try {
    const user = await User.findById(req.uid).select("role").lean()

    if (!user) {
      return res.status(401).json({ msg: "User not found", success: false })
    }

    const role = user.role ?? "user"
    const { token, expiresIn } = generateToken(req.uid, role)

    return res.json({ token, expiresIn, success: true })
  } catch (err) {
    console.error(err)
    return res.json({ msg: "Refresh token failed", success: false })
  }
}