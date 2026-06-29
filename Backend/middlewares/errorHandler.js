import {
  buildErrorResponse,
  getErrorStatusCode,
  isAppError,
} from "../utils/common/errors.js";

const shouldLogError = (error) => {
  const isExpectedTestAppError =
    process.env.NODE_ENV === "test" &&
    isAppError(error) &&
    error.expose === true;

  return !isExpectedTestAppError;
};

export const errorHandler = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  if (shouldLogError(error)) {
    console.error(error);
  }

  const statusCode = getErrorStatusCode(error);
  const payload = buildErrorResponse(error);

  return res.status(statusCode).json(payload);
};
