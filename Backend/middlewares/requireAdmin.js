/**
 * Verifica que el usuario autenticado tenga rol de administrador.
 *
 * @param {Object} req Request de Express.
 * @param {Object} res Response de Express.
 * @param {Function} next Siguiente middleware.
 * @returns {void}
 */
export const requireAdmin = (req, res, next) => {
  const currentRole = req.role ?? "user";

  if (currentRole !== "admin") {
    return res.status(403).json({ msg: "Admin only", success: false });
  }

  return next();
};