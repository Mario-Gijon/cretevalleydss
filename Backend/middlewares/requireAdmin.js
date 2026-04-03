/**
 * Verifica que el usuario autenticado tenga rol de administrador.
 *
 * @type {import("express").RequestHandler}
 */
export const requireAdmin = (req, res, next) => {
  const currentRole = req.role ?? "user";

  if (currentRole !== "admin") {
    return res.status(403).json({ msg: "Admin only", success: false });
  }

  return next();
};