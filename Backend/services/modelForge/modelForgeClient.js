import axios from "axios";

import { AppError, isAppError } from "../../utils/common/errors.js";

const SCAFFOLD_CATALOG_PATH = "/scaffold/catalog";

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

const createRequestError = (error) => {
  if (isAppError(error)) {
    return error;
  }

  const statusCode = error?.response?.status || 503;
  const payload = error?.response?.data || {};

  return new AppError(
    payload?.message || "Unable to fetch scaffold catalog from ModelForge",
    {
      statusCode,
      code:
        statusCode >= 500
          ? "MODEL_FORGE_UPSTREAM_ERROR"
          : "MODEL_FORGE_REQUEST_ERROR",
      field: payload?.error?.field ?? null,
      details: payload?.error?.details ?? null,
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
    throw createRequestError(error);
  }
};
