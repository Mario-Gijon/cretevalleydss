import axios from "axios";

import { AppError } from "../../utils/common/errors.js";

const getDecisionModelsServiceBaseUrl = (
  baseUrl = process.env.DECISION_MODELS_SERVICE_BASE_URL
) => {
  const resolvedBaseUrl = String(baseUrl || "").trim().replace(/\/+$/, "");

  if (!resolvedBaseUrl) {
    throw new AppError("DECISION_MODELS_SERVICE_BASE_URL is not configured", {
      statusCode: 500,
      code: "DECISION_MODELS_SERVICE_CONFIG_ERROR",
      field: "DECISION_MODELS_SERVICE_BASE_URL",
    });
  }

  return resolvedBaseUrl;
};

const validateStandardResponse = (payload, fallbackMessage, fallbackCode) => {
  if (
    !payload ||
    typeof payload !== "object" ||
    typeof payload.success !== "boolean" ||
    typeof payload.message !== "string" ||
    !Object.hasOwn(payload, "data")
  ) {
    throw new AppError(fallbackMessage, {
      statusCode: 502,
      code: fallbackCode,
    });
  }

  return payload;
};

const requestDecisionModelsService = async ({
  method,
  path,
  successFallbackMessage,
  errorFallbackMessage,
  invalidResponseCode,
  requestErrorCode,
  httpClient = axios,
  baseUrl,
}) => {
  let response;

  try {
    response = await httpClient.request({
      method,
      url: `${getDecisionModelsServiceBaseUrl(baseUrl)}${path}`,
      validateStatus: () => true,
    });
  } catch (error) {
    throw new AppError(errorFallbackMessage, {
      statusCode: error?.response?.status || 503,
      code: requestErrorCode,
      details: null,
      cause: error,
    });
  }

  const payload = validateStandardResponse(
    response?.data,
    successFallbackMessage,
    invalidResponseCode
  );

  if (payload.success === false) {
    throw new AppError(payload.message || errorFallbackMessage, {
      statusCode: response?.status >= 400 ? response.status : 502,
      code: payload?.error?.code || requestErrorCode,
      field: payload?.error?.field ?? null,
      details: payload?.error?.details ?? null,
    });
  }

  return payload.data;
};

export const fetchDecisionModelsServiceHealth = async (options = {}) =>
  requestDecisionModelsService({
    method: "GET",
    path: "/health",
    successFallbackMessage:
      "DecisionModelsService health response is invalid.",
    errorFallbackMessage:
      "Unable to fetch DecisionModelsService health.",
    invalidResponseCode: "DECISION_MODELS_SERVICE_HEALTH_INVALID_RESPONSE",
    requestErrorCode: "DECISION_MODELS_SERVICE_HEALTH_REQUEST_ERROR",
    ...options,
  });

export const reloadDecisionModelsService = async (options = {}) =>
  requestDecisionModelsService({
    method: "POST",
    path: "/system/reload",
    successFallbackMessage:
      "DecisionModelsService reload response is invalid.",
    errorFallbackMessage:
      "Unable to schedule DecisionModelsService reload.",
    invalidResponseCode: "DECISION_MODELS_SERVICE_RELOAD_INVALID_RESPONSE",
    requestErrorCode: "DECISION_MODELS_SERVICE_RELOAD_REQUEST_ERROR",
    ...options,
  });
