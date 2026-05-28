import { buildErrorResponse, getErrorStatusCode } from "../utils/common/errors.js";

export const errorHandler = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  console.error(error);

  const statusCode = getErrorStatusCode(error);
  const payload = buildErrorResponse(error);

  return res.status(statusCode).json(payload);
};