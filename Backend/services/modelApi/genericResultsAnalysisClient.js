import axios from "axios";

import { AppError, isAppError } from "../../utils/common/errors.js";

const path = "/results-analysis/generic-issue";

export const requestGenericIssueAnalysis = async ({
  analysisContext,
  httpClient = axios,
  decisionModelsServiceBaseUrl = process.env.DECISION_MODELS_SERVICE_BASE_URL,
} = {}) => {
  const baseUrl = String(decisionModelsServiceBaseUrl || "").trim().replace(/\/+$/, "");
  if (!baseUrl) throw new AppError("DECISION_MODELS_SERVICE_BASE_URL is not configured", { statusCode: 500, code: "GENERIC_ANALYSIS_CONFIG_ERROR", field: "DECISION_MODELS_SERVICE_BASE_URL" });
  try {
    const response = await httpClient.post(`${baseUrl}${path}`, analysisContext);
    const payload = response?.data;
    if (!payload || typeof payload !== "object" || typeof payload.success !== "boolean" || typeof payload.message !== "string" || !Object.hasOwn(payload, "data")) throw new AppError("Generic analysis response is invalid", { statusCode: 502, code: "GENERIC_ANALYSIS_INVALID_RESPONSE" });
    if (!payload.success) throw new AppError(payload.message || "Generic issue analysis failed", { statusCode: response?.status >= 400 ? response.status : 502, code: payload.error?.code || "GENERIC_ANALYSIS_UPSTREAM_ERROR", field: payload.error?.field ?? null, details: payload.error?.details ?? null });
    return payload.data;
  } catch (error) {
    if (isAppError(error)) throw error;
    const payload = error?.response?.data;
    throw new AppError(payload?.message || "Unable to request generic issue analysis", { statusCode: error?.response?.status || 503, code: payload?.error?.code || "GENERIC_ANALYSIS_REQUEST_ERROR", field: payload?.error?.field ?? null, details: payload?.error?.details ?? null, cause: error });
  }
};
