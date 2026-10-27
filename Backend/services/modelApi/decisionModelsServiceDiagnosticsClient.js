import axios from "axios";

import { AppError } from "../../utils/common/errors.js";
import { isPlainObject } from "../../utils/common/objects.js";

const DEFAULT_TIMEOUT_MS = 5000;

const resolveTimeoutMs = (timeoutMs, env = process.env) => {
  const configured = timeoutMs ?? env.DECISION_MODELS_DIAGNOSTICS_TIMEOUT_MS;
  if (configured === undefined || configured === null || configured === "") {
    return DEFAULT_TIMEOUT_MS;
  }

  const parsed = Number(configured);
  if (!Number.isInteger(parsed) || parsed < 100 || parsed > 30000) {
    throw new AppError(
      "DECISION_MODELS_DIAGNOSTICS_TIMEOUT_MS must be an integer from 100 to 30000",
      {
        statusCode: 500,
        code: "DECISION_MODELS_SERVICE_CONFIG_ERROR",
        field: "DECISION_MODELS_DIAGNOSTICS_TIMEOUT_MS",
      }
    );
  }
  return parsed;
};

const buildDiagnosticError = ({
  statusCode,
  code,
  message,
  field = null,
  details = null,
  cause = null,
}) =>
  new AppError(message, {
    statusCode,
    code,
    field,
    details,
    cause,
  });

const throwUpstreamFailure = ({ response, payload }) => {
  const status = Number.isInteger(response?.status) ? response.status : 502;
  const upstreamCode = payload?.error?.code;
  const field = typeof payload?.error?.field === "string"
    ? payload.error.field
    : null;

  if (upstreamCode === "DIAGNOSTIC_NOT_SUPPORTED" || upstreamCode === "MODEL_NOT_FOUND") {
    throw buildDiagnosticError({
      statusCode: 501,
      code: "DECISION_MODELS_SERVICE_DIAGNOSTIC_NOT_SUPPORTED",
      message: "The configured decision model does not provide this diagnostic.",
      field,
    });
  }

  if (status === 422 || upstreamCode === "DIAGNOSTIC_INPUT_INVALID") {
    throw buildDiagnosticError({
      statusCode: 422,
      code: "DECISION_MODELS_SERVICE_DIAGNOSTIC_INPUT_INVALID",
      message: "DecisionModelsService rejected the diagnostic request.",
      field,
    });
  }

  if (status >= 500) {
    throw buildDiagnosticError({
      statusCode: 502,
      code: "DECISION_MODELS_SERVICE_DIAGNOSTIC_ERROR",
      message: "DecisionModelsService could not complete the diagnostic.",
    });
  }

  throw buildDiagnosticError({
    statusCode: 502,
    code: "DECISION_MODELS_SERVICE_DIAGNOSTIC_ERROR",
    message: "DecisionModelsService returned an unsuccessful diagnostic response.",
  });
};

const isTimeoutError = (error) =>
  error?.code === "ECONNABORTED" || error?.code === "ETIMEDOUT";

export const requestDecisionModelsServiceDiagnostic = async ({
  apiModelKey,
  requestPayload,
  decisionModelsServiceBaseUrl =
    process.env.DECISION_MODELS_SERVICE_BASE_URL || "http://localhost:7000",
  timeoutMs,
  httpClient = axios,
}) => {
  const normalizedBaseUrl = String(decisionModelsServiceBaseUrl || "")
    .trim()
    .replace(/\/+$/g, "");
  if (!normalizedBaseUrl) {
    throw buildDiagnosticError({
      statusCode: 500,
      code: "DECISION_MODELS_SERVICE_CONFIG_ERROR",
      message: "DECISION_MODELS_SERVICE_BASE_URL is not configured.",
      field: "DECISION_MODELS_SERVICE_BASE_URL",
    });
  }

  if (typeof apiModelKey !== "string" || !apiModelKey.trim()) {
    throw buildDiagnosticError({
      statusCode: 500,
      code: "DECISION_MODELS_SERVICE_CONFIG_ERROR",
      message: "A registered API model key is required for diagnostics.",
      field: "apiModelKey",
    });
  }

  const timeout = resolveTimeoutMs(timeoutMs);
  const url = `${normalizedBaseUrl}/diagnostics/${encodeURIComponent(apiModelKey.trim())}`;
  let response;

  try {
    response = await httpClient.post(url, requestPayload, {
      timeout,
      validateStatus: () => true,
    });
  } catch (error) {
    if (error?.response) {
      response = error.response;
    } else if (isTimeoutError(error)) {
      throw buildDiagnosticError({
        statusCode: 504,
        code: "DECISION_MODELS_SERVICE_DIAGNOSTIC_TIMEOUT",
        message: "DecisionModelsService did not respond before the diagnostic timeout.",
        cause: error,
      });
    } else {
      throw buildDiagnosticError({
        statusCode: 503,
        code: "DECISION_MODELS_SERVICE_UNAVAILABLE",
        message: "DecisionModelsService is unavailable for diagnostics.",
        cause: error,
      });
    }
  }

  const envelope = response?.data;
  if (
    !Number.isInteger(response?.status) ||
    !isPlainObject(envelope) ||
    typeof envelope.success !== "boolean" ||
    typeof envelope.message !== "string" ||
    !Object.hasOwn(envelope, "data") ||
    (Object.hasOwn(envelope, "error") &&
      envelope.error !== null &&
      !isPlainObject(envelope.error)) ||
    (envelope.success === true && envelope.error != null)
  ) {
    throw buildDiagnosticError({
      statusCode: 502,
      code: "DECISION_MODELS_SERVICE_INVALID_RESPONSE",
      message: "DecisionModelsService returned an invalid diagnostic response.",
    });
  }

  if (
    envelope.success !== true ||
    response.status < 200 ||
    response.status >= 300
  ) {
    throwUpstreamFailure({ response, payload: envelope });
  }

  return envelope.data;
};
