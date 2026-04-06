export class AppError extends Error {
  /**
   * Crea un error de aplicación tipado con metadatos reutilizables.
   *
   * @param {string} message Mensaje principal del error.
   * @param {Object} res Response de Express.
   */
  constructor(
    message,
    {
      statusCode = 500,
      code = "APP_ERROR",
      details = null,
      expose = true,
      cause = null,
    } = {}
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.expose = expose;
    this.cause = cause;

    Error.captureStackTrace?.(this, AppError);
  }
}

/**
 * Comprueba si un valor es una instancia de AppError.
 *
 * @param {unknown} error Error a comprobar.
 * @returns {boolean}
 */
export const isAppError = (error) => error instanceof AppError;

/**
 * Crea una factoría de errores tipados con statusCode y code fijos.
 *
 * @param {number} statusCode Código HTTP del error.
 * @param {string} code Código interno del error.
 * @returns {Function}
 */
const buildErrorFactory =
  (statusCode, code) =>
  (message, details = null) =>
    new AppError(message, { statusCode, code, details });

/**
 * Crea un error 400 Bad Request.
 *
 * @param {string} message Mensaje del error.
 * @param {any} [details=null] Detalles adicionales.
 * @returns {AppError}
 */
export const createBadRequestError = buildErrorFactory(400, "BAD_REQUEST");

/**
 * Crea un error 401 Unauthorized.
 *
 * @param {string} message Mensaje del error.
 * @param {any} [details=null] Detalles adicionales.
 * @returns {AppError}
 */
export const createUnauthorizedError = buildErrorFactory(401, "UNAUTHORIZED");

/**
 * Crea un error 403 Forbidden.
 *
 * @param {string} message Mensaje del error.
 * @param {any} [details=null] Detalles adicionales.
 * @returns {AppError}
 */
export const createForbiddenError = buildErrorFactory(403, "FORBIDDEN");

/**
 * Crea un error 404 Not Found.
 *
 * @param {string} message Mensaje del error.
 * @param {any} [details=null] Detalles adicionales.
 * @returns {AppError}
 */
export const createNotFoundError = buildErrorFactory(404, "NOT_FOUND");

/**
 * Crea un error 409 Conflict.
 *
 * @param {string} message Mensaje del error.
 * @param {any} [details=null] Detalles adicionales.
 * @returns {AppError}
 */
export const createConflictError = buildErrorFactory(409, "CONFLICT");

/**
 * Crea un error 500 Internal Error.
 *
 * @param {string} message Mensaje del error.
 * @param {any} [details=null] Detalles adicionales.
 * @returns {AppError}
 */
export const createInternalError = buildErrorFactory(500, "INTERNAL_ERROR");

/**
 * Obtiene el statusCode de un error, devolviendo un valor por defecto si no existe.
 *
 * @param {unknown} error Error a inspeccionar.
 * @param {number} [fallback=500] Código por defecto.
 * @returns {number}
 */
export const getErrorStatusCode = (error, fallback = 500) => {
  if (isAppError(error) && Number.isInteger(error.statusCode)) {
    return error.statusCode;
  }

  return fallback;
};

/**
 * Construye el payload estándar de respuesta para un error.
 *
 * @param {unknown} error Error a transformar.
 * @param {string} [fallbackMessage="Unexpected server error."] Mensaje por defecto.
 * @returns {Object}
 */
export const getErrorResponsePayload = (
  error,
  fallbackMessage = "Unexpected server error."
) => {
  if (isAppError(error)) {
    const payload = {
      success: false,
      message: error.expose ? error.message : fallbackMessage,
    };

    if (error.code) payload.code = error.code;
    if (error.details) payload.details = error.details;

    return payload;
  }

  return {
    success: false,
    message: fallbackMessage,
  };
};