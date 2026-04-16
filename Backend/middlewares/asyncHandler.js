/**
 * Envuelve un handler asíncrono y reenvía los errores a next.
 *
 * @param {Function} fn Handler asíncrono de Express.
 * @returns {Function}
 */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);