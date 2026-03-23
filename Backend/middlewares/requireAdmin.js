/**
 * Verifica que el usuario autenticado tenga rol de administrador.
 *
 * @type {import("express").RequestHandler}
 */
export const requireAdmin = (req, res, next) => {
  if ((req.role ?? "user") !== "admin") {
    return res.status(403).json({ msg: "Admin only", success: false });
  }

  next();
};