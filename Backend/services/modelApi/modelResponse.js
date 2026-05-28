import { AppError, isAppError } from "../../utils/common/errors.js";

export const unwrapModelApiResponse = (
  response,
  fallbackMessage = "Model execution failed"
) => {
  const payload = response?.data || {};

  if (payload.success) {
    return payload.data ?? null;
  }

  const upstreamError = payload.error || {};
  throw new AppError(payload.message || fallbackMessage, {
    statusCode: response?.status && response.status >= 400 ? response.status : 400,
    code: upstreamError.code || "MODEL_EXECUTION_ERROR",
    field: upstreamError.field ?? null,
    details: upstreamError.details ?? null,
  });
};

export const createModelApiRequestError = (
  error,
  fallbackMessage = "Model execution failed"
) => {
  if (isAppError(error)) {
    return error;
  }

  const statusCode = error?.response?.status || 500;
  const payload = error?.response?.data || {};
  const upstreamError = payload.error || {};

  return new AppError(
    payload.message || error?.message || fallbackMessage,
    {
      statusCode,
      code:
        upstreamError.code ||
        (statusCode >= 500 ? "INTERNAL_ERROR" : "MODEL_EXECUTION_ERROR"),
      field: upstreamError.field ?? null,
      details: upstreamError.details ?? null,
      cause: error,
    }
  );
};
