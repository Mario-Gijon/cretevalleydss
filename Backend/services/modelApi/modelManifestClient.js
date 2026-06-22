import axios from "axios";

import { AppError, isAppError } from "../../utils/common/errors.js";
const MODEL_MANIFEST_PATH = "/models/manifest";

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
    Object.hasOwn(payload, "data")
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
  fallbackMessage = "Unable to fetch model manifest from DecisionModelsService"
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

export const fetchModelManifest = async ({
  httpClient = axios,
  decisionModelsServiceBaseUrl = process.env.DECISION_MODELS_SERVICE_BASE_URL,
} = {}) => {
  const baseUrl = String(decisionModelsServiceBaseUrl || "").trim();

  if (!baseUrl) {
    throw new AppError("DECISION_MODELS_SERVICE_BASE_URL is not configured", {
      statusCode: 500,
      code: "MODEL_MANIFEST_CONFIG_ERROR",
      field: "DECISION_MODELS_SERVICE_BASE_URL",
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
      "Model manifest response does not use the expected success payload shape",
      {
        requiredKeys: ["success", "message", "data"],
      }
    );
  }

  if (payload.success === false) {
    throw createUpstreamContractError(
      response,
      "DecisionModelsService returned an unsuccessful model manifest response"
    );
  }

  return validateManifestData(payload.data);
};

export const getManifestModels = async (options = {}) => {
  const manifest = await fetchModelManifest(options);

  return manifest.models;
};

export const getPublicIssueManifestModels = async (options = {}) => {
  const models = await getManifestModels(options);

  return models.filter(
    (model) => model?.modelKind === "issue" && model?.publicUsable === true
  );
};
