export class AppError extends Error {
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

export const isAppError = (error) => error instanceof AppError;

const buildErrorFactory =
  (statusCode, code) =>
  (message, options = {}) =>
    new AppError(message, {
      statusCode,
      code,
      ...options,
    });

export const createBadRequestError = buildErrorFactory(400, "BAD_REQUEST");

export const createUnauthorizedError = buildErrorFactory(401, "UNAUTHORIZED");

export const createForbiddenError = buildErrorFactory(403, "FORBIDDEN");

export const createNotFoundError = buildErrorFactory(404, "NOT_FOUND");

export const createConflictError = buildErrorFactory(409, "CONFLICT");

export const createInternalError = buildErrorFactory(500, "INTERNAL_ERROR");

export const getErrorStatusCode = (error, fallback = 500) => {
  if (isAppError(error) && Number.isInteger(error.statusCode)) {
    return error.statusCode;
  }

  return fallback;
};

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