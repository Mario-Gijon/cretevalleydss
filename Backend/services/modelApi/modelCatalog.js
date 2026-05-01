import { createBadRequestError } from "../../utils/common/errors.js";

const trimSlashes = (value) => String(value || "").trim().replace(/^\/+|\/+$/g, "");

const ensureLeadingSlash = (value) => {
  const cleanValue = trimSlashes(value);

  return cleanValue ? `/${cleanValue}` : null;
};

const normalizeBaseUrl = (value) => String(value || "").trim().replace(/\/+$/, "");

const getModelDisplayName = (model) => String(model?.name || "unknown");
const getValueType = (value) => {
  if (Array.isArray(value)) return "array";
  if (value === null) return "null";
  return typeof value;
};

const throwInvalidEndpointConfig = ({ model, field, message, value }) => {
  throw createBadRequestError(
    `Invalid API endpoint configuration for model ${getModelDisplayName(model)}: ${field} ${message}`,
    {
      field: `model.${field}`,
      details: {
        model: getModelDisplayName(model),
        requiredField: field,
        message,
        receivedType: getValueType(value),
      },
    }
  );
};

const requireModelDocument = (modelOrName) => {
  if (!modelOrName || typeof modelOrName !== "object") {
    throw createBadRequestError(
      "Model endpoint resolution requires explicit model configuration",
      {
        field: "model",
        details: {
          requiredFields: ["apiModelKey", "apiEndpoint.path"],
        },
      }
    );
  }

  return modelOrName;
};

/**
 * Obtiene la clave de endpoint asociada a un modelo.
 *
 * @param {Object} [modelOrName={}] Documento del modelo.
 * @returns {string}
 */
export const getModelEndpointKey = (modelOrName = {}) => {
  const model = requireModelDocument(modelOrName);
  const rawApiModelKey = model.apiModelKey;

  if (typeof rawApiModelKey !== "string") {
    throwInvalidEndpointConfig({
      model,
      field: "apiModelKey",
      message: "must be a non-empty string",
      value: rawApiModelKey,
    });
  }

  const apiModelKey = trimSlashes(rawApiModelKey);

  if (!apiModelKey) {
    throwInvalidEndpointConfig({
      model,
      field: "apiModelKey",
      message: "must be a non-empty string",
      value: rawApiModelKey,
    });
  }

  return apiModelKey;
};

/**
 * Obtiene la ruta del endpoint de ApiModels para un modelo.
 *
 * @param {Object} [modelOrName={}] Documento del modelo.
 * @returns {string}
 */
export const getModelEndpointPath = (modelOrName = {}) => {
  const model = requireModelDocument(modelOrName);
  const rawEndpointPath = model.apiEndpoint?.path;

  if (typeof rawEndpointPath !== "string") {
    throwInvalidEndpointConfig({
      model,
      field: "apiEndpoint.path",
      message: "must be a non-empty string",
      value: rawEndpointPath,
    });
  }

  const endpointPath = ensureLeadingSlash(rawEndpointPath);

  if (!endpointPath) {
    throwInvalidEndpointConfig({
      model,
      field: "apiEndpoint.path",
      message: "must be a non-empty string",
      value: rawEndpointPath,
    });
  }

  return endpointPath;
};

/**
 * Construye una URL completa de ApiModels para un modelo.
 *
 * @param {string} apiModelsBaseUrl Base URL de ApiModels.
 * @param {Object} modelOrName Documento del modelo.
 * @returns {string}
 */
export const buildModelEndpointUrl = (apiModelsBaseUrl, modelOrName = {}) => {
  const endpointPath = getModelEndpointPath(modelOrName);

  return `${normalizeBaseUrl(apiModelsBaseUrl)}${endpointPath}`;
};
