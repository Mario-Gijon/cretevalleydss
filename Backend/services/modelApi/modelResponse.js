import { AppError, isAppError } from "../../utils/common/errors.js";

const cloneOptional = (value) => {
  try {
    return value === undefined ? null : JSON.parse(JSON.stringify(value));
  } catch {
    return null;
  }
};

const sanitizeModelApiHeaders = (headers) =>
  Object.fromEntries(
    Object.entries(headers || {}).filter(
      ([key]) =>
        !["authorization", "cookie", "set-cookie"].includes(
          key.toLowerCase()
        )
    )
  );

export const buildModelApiResponseEvidence = (response) => ({
  httpStatus: response?.status ?? null,
  headers: sanitizeModelApiHeaders(response?.headers),
  rawBody: cloneOptional(response?.data),
  unwrappedBody: null,
});

export const serializeModelApiError = (error) => ({
  name: error?.name || "Error",
  message: error?.message || String(error),
  code: error?.code ?? null,
  status: error?.status ?? error?.statusCode ?? error?.response?.status ?? null,
  field: error?.field ?? null,
  details: cloneOptional(error?.details),
  responseBody: cloneOptional(error?.response?.data),
});

export const buildModelApiTransportFailureEvidence = (error) => ({
  response: error?.response ? buildModelApiResponseEvidence(error.response) : null,
  error: serializeModelApiError(error),
});

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
