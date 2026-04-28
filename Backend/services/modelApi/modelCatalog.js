const MODEL_ENDPOINT_KEYS = {
  TOPSIS: "topsis",
  "FUZZY TOPSIS": "fuzzy_topsis",
  BORDA: "borda",
  ARAS: "aras",
  "HERRERA-VIEDMA CRP": "herrera_viedma_crp",
  "HERRERA VIEDMA CRP": "herrera_viedma_crp",
  CRP: "herrera_viedma_crp",
};

const MODEL_ENDPOINT_KEY_VALUES = new Set(Object.values(MODEL_ENDPOINT_KEYS));

const trimSlashes = (value) => String(value || "").trim().replace(/^\/+|\/+$/g, "");

const ensureLeadingSlash = (value) => {
  const cleanValue = trimSlashes(value);

  return cleanValue ? `/${cleanValue}` : null;
};

const normalizeBaseUrl = (value) => String(value || "").trim().replace(/\/+$/, "");

const getModelName = (modelOrName = "") => {
  if (modelOrName && typeof modelOrName === "object") {
    return modelOrName.name || "";
  }

  return modelOrName;
};

/**
 * Obtiene la clave de endpoint asociada a un modelo.
 *
 * @param {string|Object} [modelOrName=""] Nombre o documento del modelo.
 * @returns {string|null}
 */
export const getModelEndpointKey = (modelOrName = "") => {
  if (modelOrName && typeof modelOrName === "object") {
    const apiModelKey = trimSlashes(modelOrName.apiModelKey);

    if (apiModelKey) {
      return apiModelKey;
    }
  }

  const cleanName = String(getModelName(modelOrName)).trim();
  const cleanKey = cleanName.toLowerCase();

  if (MODEL_ENDPOINT_KEY_VALUES.has(cleanKey)) {
    return cleanKey;
  }

  const normalizedName = cleanName.toUpperCase();

  return MODEL_ENDPOINT_KEYS[normalizedName] ?? null;
};

/**
 * Obtiene la ruta del endpoint de ApiModels para un modelo.
 *
 * @param {string|Object} [modelOrName=""] Nombre o documento del modelo.
 * @returns {string|null}
 */
export const getModelEndpointPath = (modelOrName = "") => {
  if (modelOrName && typeof modelOrName === "object") {
    const manifestPath = ensureLeadingSlash(modelOrName.apiEndpoint?.path);

    if (manifestPath) {
      return manifestPath;
    }
  }

  const modelKey = getModelEndpointKey(modelOrName);

  return modelKey ? `/${modelKey}` : null;
};

/**
 * Construye una URL completa de ApiModels para un modelo.
 *
 * @param {string} apiModelsBaseUrl Base URL de ApiModels.
 * @param {string|Object} modelOrName Nombre o documento del modelo.
 * @returns {string|null}
 */
export const buildModelEndpointUrl = (apiModelsBaseUrl, modelOrName = "") => {
  const endpointPath = getModelEndpointPath(modelOrName);

  if (!endpointPath) {
    return null;
  }

  return `${normalizeBaseUrl(apiModelsBaseUrl)}${endpointPath}`;
};
