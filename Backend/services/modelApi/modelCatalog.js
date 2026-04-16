const MODEL_ENDPOINT_KEYS = {
  TOPSIS: "topsis",
  "FUZZY TOPSIS": "fuzzy_topsis",
  BORDA: "borda",
  ARAS: "aras",
  "HERRERA-VIEDMA CRP": "herrera_viedma_crp",
  "HERRERA VIEDMA CRP": "herrera_viedma_crp",
  CRP: "herrera_viedma_crp",
};

/**
 * Obtiene la clave de endpoint asociada a un modelo.
 *
 * @param {string} [modelName=""] Nombre del modelo.
 * @returns {string|null}
 */
export const getModelEndpointKey = (modelName = "") => {
  const normalizedName = String(modelName).trim().toUpperCase();

  return MODEL_ENDPOINT_KEYS[normalizedName] ?? null;
};