import axios from "axios";

import { AppError, isAppError } from "../../utils/common/errors.js";

const SCAFFOLD_CATALOG_PATH = "/scaffold/catalog";
const MODEL_PACKAGE_PREVIEW_PATH = "/scaffold/model-package/preview";
const MODEL_PACKAGE_APPLY_PATH = "/scaffold/model-package/apply";

const joinUrl = (baseUrl, path) => {
  const cleanBaseUrl = String(baseUrl || "").trim().replace(/\/+$/, "");
  const cleanPath = String(path || "").trim().replace(/^\/+/, "");

  return `${cleanBaseUrl}/${cleanPath}`;
};

const createConfigError = () =>
  new AppError("MODEL_FORGE_BASE_URL is not configured", {
    statusCode: 500,
    code: "MODEL_FORGE_CONFIG_ERROR",
    field: "MODEL_FORGE_BASE_URL",
  });

const normalizeUpstreamErrorPayload = (payload) => {
  if (!payload || typeof payload !== "object") {
    return {
      message: null,
      code: null,
      field: null,
      details: null,
    };
  }

  if (payload.error && typeof payload.error === "object") {
    return {
      message: payload.message || null,
      code: payload.error.code || null,
      field: payload.error.field ?? null,
      details: payload.error.details ?? null,
    };
  }

  if (Object.prototype.hasOwnProperty.call(payload, "detail")) {
    return {
      message:
        typeof payload.detail === "string"
          ? payload.detail
          : "ModelForge request failed",
      code: null,
      field: null,
      details: payload.detail,
    };
  }

  return {
    message: payload.message || null,
    code: null,
    field: null,
    details: null,
  };
};

const createRequestError = (
  error,
  fallbackMessage = "ModelForge request failed"
) => {
  if (isAppError(error)) {
    return error;
  }

  const statusCode = error?.response?.status || 503;
  const payload = error?.response?.data || {};
  const upstream = normalizeUpstreamErrorPayload(payload);

  return new AppError(
    upstream.message || fallbackMessage,
    {
      statusCode,
      code:
        upstream.code ||
        statusCode >= 500
          ? "MODEL_FORGE_UPSTREAM_ERROR"
          : "MODEL_FORGE_REQUEST_ERROR",
      field: upstream.field,
      details: upstream.details,
      cause: error,
    }
  );
};

const validateCatalogPayload = (payload) => {
  if (!payload || typeof payload !== "object") {
    throw new AppError("ModelForge scaffold catalog response is invalid", {
      statusCode: 502,
      code: "MODEL_FORGE_INVALID_RESPONSE",
    });
  }

  if (!Array.isArray(payload.parameterStructures)) {
    throw new AppError("ModelForge scaffold catalog parameterStructures is invalid", {
      statusCode: 502,
      code: "MODEL_FORGE_INVALID_RESPONSE",
      field: "parameterStructures",
    });
  }

  if (!Array.isArray(payload.evaluationStructures)) {
    throw new AppError("ModelForge scaffold catalog evaluationStructures is invalid", {
      statusCode: 502,
      code: "MODEL_FORGE_INVALID_RESPONSE",
      field: "evaluationStructures",
    });
  }

  return payload;
};

export const fetchModelForgeCatalog = async ({
  httpClient = axios,
  modelForgeBaseUrl = process.env.MODEL_FORGE_BASE_URL,
} = {}) => {
  const baseUrl = String(modelForgeBaseUrl || "").trim();

  if (!baseUrl) {
    throw createConfigError();
  }

  try {
    const response = await httpClient.get(joinUrl(baseUrl, SCAFFOLD_CATALOG_PATH));
    return validateCatalogPayload(response?.data);
  } catch (error) {
    throw createRequestError(
      error,
      "Unable to fetch scaffold catalog from ModelForge"
    );
  }
};

const requestModelForgeJson = async ({
  httpClient = axios,
  modelForgeBaseUrl = process.env.MODEL_FORGE_BASE_URL,
  method,
  path,
  payload,
  fallbackMessage,
} = {}) => {
  const baseUrl = String(modelForgeBaseUrl || "").trim();

  if (!baseUrl) {
    throw createConfigError();
  }

  try {
    const response = await httpClient.request({
      method,
      url: joinUrl(baseUrl, path),
      data: payload,
    });

    return response?.data;
  } catch (error) {
    throw createRequestError(error, fallbackMessage);
  }
};

export const previewModelForgeModelPackage = async (payload, options = {}) =>
  requestModelForgeJson({
    ...options,
    method: "POST",
    path: MODEL_PACKAGE_PREVIEW_PATH,
    payload,
    fallbackMessage: "Unable to preview scaffold package in ModelForge",
  });

export const applyModelForgeModelPackage = async (payload, options = {}) =>
  requestModelForgeJson({
    ...options,
    method: "POST",
    path: MODEL_PACKAGE_APPLY_PATH,
    payload,
    fallbackMessage: "Unable to apply scaffold package in ModelForge",
  });
