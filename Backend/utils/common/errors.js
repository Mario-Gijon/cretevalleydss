/**
 * Error de aplicación tipado con metadatos reutilizables para la API.
 */
export class AppError extends Error {
  /**
   * Crea una instancia de error de aplicación.
   *
   * @param {string} message Mensaje principal del error.
   * @param {Object} [options] Configuración adicional del error.
   * @param {number} [options.statusCode=500] Código HTTP asociado.
   * @param {string} [options.code="INTERNAL_ERROR"] Código interno del error.
   * @param {?string} [options.field=null] Campo relacionado con el error.
   * @param {*} [options.details=null] Información adicional del error.
   * @param {boolean} [options.expose=true] Indica si el mensaje puede exponerse al cliente.
   * @param {*} [options.cause=null] Error original que provocó este error.
   */
  constructor(
    message,
    {
      statusCode = 500,
      code = "INTERNAL_ERROR",
      field = null,
      details = null,
      expose = true,
      cause = null,
    } = {}
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.field = field;
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
 * Crea una factoría para errores tipados con statusCode y code fijos.
 *
 * @param {number} statusCode Código HTTP del error.
 * @param {string} code Código interno del error.
 * @returns {Function}
 */
const buildErrorFactory =
  (statusCode, code) =>
  (message, options = {}) =>
    new AppError(message, {
      statusCode,
      code,
      ...options,
    });

/**
 * Crea un error 400 BAD_REQUEST.
 */
export const createBadRequestError = buildErrorFactory(400, "BAD_REQUEST");

/**
 * Crea un error 401 UNAUTHORIZED.
 */
export const createUnauthorizedError = buildErrorFactory(401, "UNAUTHORIZED");

/**
 * Crea un error 403 FORBIDDEN.
 */
export const createForbiddenError = buildErrorFactory(403, "FORBIDDEN");

/**
 * Crea un error 404 NOT_FOUND.
 */
export const createNotFoundError = buildErrorFactory(404, "NOT_FOUND");

/**
 * Crea un error 409 CONFLICT.
 */
export const createConflictError = buildErrorFactory(409, "CONFLICT");

/**
 * Crea un error 500 INTERNAL_ERROR.
 */
export const createInternalError = buildErrorFactory(500, "INTERNAL_ERROR");

/**
 * Obtiene el código HTTP de un error.
 *
 * @param {unknown} error Error a inspeccionar.
 * @param {number} [fallback=500] Código de respaldo si el error no está tipado.
 * @returns {number}
 */
export const getErrorStatusCode = (error, fallback = 500) => {
  if (isAppError(error) && Number.isInteger(error.statusCode)) {
    return error.statusCode;
  }

  return fallback;
};

/**
 * Construye la respuesta JSON de error con el contrato unificado.
 *
 * @param {unknown} error Error a serializar.
 * @param {string} [fallbackMessage="Unexpected server error."] Mensaje de respaldo.
 * @returns {Object}
 */
export const buildErrorResponse = (
  error,
  fallbackMessage = "Unexpected server error."
) => {
  if (isAppError(error)) {
    return {
      success: false,
      message: error.expose ? error.message : fallbackMessage,
      data: null,
      error: {
        code: error.code || "INTERNAL_ERROR",
        field: error.field ?? null,
        details: error.details ?? null,
      },
    };
  }

  return {
    success: false,
    message: fallbackMessage,
    data: null,
    error: {
      code: "INTERNAL_ERROR",
      field: null,
      details: null,
    },
  };
};