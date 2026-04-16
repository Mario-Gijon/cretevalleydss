import { buildErrorResponse, getErrorStatusCode } from "../utils/common/errors.js";

/**
 * Middleware global de errores.
 *
 * Centraliza la serialización de errores de la API para que los controllers
 * no tengan que repetir bloques catch con la misma respuesta.
 *
 * @param {unknown} error Error capturado en la cadena de middlewares.
 * @param {Object} req Request de Express.
 * @param {Object} res Response de Express.
 * @param {Object} next Next de Express.
 * @returns {void}
 */
export const errorHandler = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  console.error(error);

  const statusCode = getErrorStatusCode(error);
  const payload = buildErrorResponse(error);

  return res.status(statusCode).json(payload);
};