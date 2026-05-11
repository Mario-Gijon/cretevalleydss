import axios from "axios";

import { AppError, isAppError } from "../../utils/common/errors.js";

const MODEL_MANIFEST_PATH = "/models/manifest";

const hasOwn = (value, key) =>
  Object.prototype.hasOwnProperty.call(value || {}, key);

const joinUrl = (baseUrl, path) => {
  const cleanBaseUrl = String(baseUrl || "").trim().replace(/\/+$/, "");
  const cleanPath = String(path || "").trim().replace(/^\/+/, "");

  return `${cleanBaseUrl}/${cleanPath}`;
};

const isStandardApiResponse = (payload) => {
  return (
    payload !== null &&
    typeof payload === "object" &&
    typeof payload.success === "boolean" &&
    typeof payload.message === "string" &&
    hasOwn(payload, "data")
  );
};

const createInvalidManifestError = (message, details = null) =>
  new AppError(message, {
    statusCode: 502,
    code: "MODEL_MANIFEST_INVALID_RESPONSE",
    details,
  });

const validateManifestData = (data) => {
  if (!data || typeof data !== "object") {
    throw createInvalidManifestError("Model manifest response data is invalid");
  }

  if (!Array.isArray(data.models)) {
    throw createInvalidManifestError("Model manifest models must be an array");
  }

  if (typeof data.manifestVersion !== "string") {
    throw createInvalidManifestError(
      "Model manifest version is missing or invalid"
    );
  }

  if (typeof data.apiVersion !== "string") {
    throw createInvalidManifestError("Model manifest API version is invalid");
  }

  if (!data.contract || typeof data.contract !== "object") {
    throw createInvalidManifestError("Model manifest contract is invalid");
  }

  const missingContractKeys = ["success", "message", "data", "error"].filter(
    (key) => !hasOwn(data.contract, key)
  );

  if (missingContractKeys.length > 0) {
    throw createInvalidManifestError(
      "Model manifest contract is missing standard keys",
      {
        missingContractKeys,
      }
    );
  }

  return data;
};

const createUpstreamContractError = (response, fallbackMessage) => {
  const payload = response?.data || {};
  const upstreamError = payload.error || {};

  return new AppError(payload.message || fallbackMessage, {
    statusCode: response?.status && response.status >= 400 ? response.status : 502,
    code: upstreamError.code || "MODEL_MANIFEST_UPSTREAM_ERROR",
    field: upstreamError.field ?? null,
    details: upstreamError.details ?? null,
  });
};

const createManifestRequestError = (
  error,
  fallbackMessage = "Unable to fetch model manifest from ApiModels"
) => {
  if (isAppError(error)) {
    return error;
  }

  const statusCode = error?.response?.status || 503;
  const payload = error?.response?.data || {};
  const upstreamError = payload.error || {};

  if (isStandardApiResponse(payload)) {
    return new AppError(payload.message || fallbackMessage, {
      statusCode,
      code:
        upstreamError.code ||
        (statusCode >= 500
          ? "MODEL_MANIFEST_UPSTREAM_ERROR"
          : "MODEL_MANIFEST_REQUEST_ERROR"),
      field: upstreamError.field ?? null,
      details: upstreamError.details ?? null,
      cause: error,
    });
  }

  return new AppError(fallbackMessage, {
    statusCode,
    code:
      statusCode >= 500
        ? "MODEL_MANIFEST_UPSTREAM_ERROR"
        : "MODEL_MANIFEST_REQUEST_ERROR",
    details: null,
    cause: error,
  });
};

/**
 * Fetches the ApiModels manifest using the Backend API response contract.
 *
 * @param {Object} [options] Request options.
 * @param {Object} [options.httpClient] HTTP client compatible with axios.
 * @param {string} [options.apiModelsBaseUrl] ApiModels base URL.
 * @returns {Promise<Object>} Manifest data payload.
 */
export const fetchModelManifest = async ({
  httpClient = axios,
  apiModelsBaseUrl = process.env.ORIGIN_APIMODELS,
} = {}) => {
  const baseUrl = String(apiModelsBaseUrl || "").trim();

  if (!baseUrl) {
    throw new AppError("ORIGIN_APIMODELS is not configured", {
      statusCode: 500,
      code: "MODEL_MANIFEST_CONFIG_ERROR",
      field: "ORIGIN_APIMODELS",
    });
  }

  let response;

  try {
    response = await httpClient.get(joinUrl(baseUrl, MODEL_MANIFEST_PATH));
  } catch (error) {
    throw createManifestRequestError(error);
  }

  const payload = response?.data;

  if (!isStandardApiResponse(payload)) {
    throw createInvalidManifestError(
      "Model manifest response does not use the standard API contract",
      {
        requiredKeys: ["success", "message", "data"],
      }
    );
  }

  if (payload.success === false) {
    throw createUpstreamContractError(
      response,
      "ApiModels returned an unsuccessful model manifest response"
    );
  }

  return validateManifestData(payload.data);
};

/**
 * Fetches all models declared by the ApiModels manifest.
 *
 * @param {Object} [options] Request options forwarded to fetchModelManifest.
 * @returns {Promise<Array<Object>>}
 */
export const getManifestModels = async (options = {}) => {
  const manifest = await fetchModelManifest(options);

  return manifest.models;
};

/**
 * Fetches manifest models marked as issue models.
 *
 * @param {Object} [options] Request options forwarded to fetchModelManifest.
 * @returns {Promise<Array<Object>>}
 */
export const getPublicIssueManifestModels = async (options = {}) => {
  const models = await getManifestModels(options);

  return models.filter((model) => model?.isIssueModel === true);
};
