/**
 * Obtiene la clave de endpoint asociada a un modelo.
 *
 * @param {string} [modelName] Nombre del modelo.
 * @returns {string|null}
 */
export const getModelEndpointKey = (modelName = "") => {
  const normalizedName = String(modelName).trim().toUpperCase();

  if (normalizedName === "TOPSIS") return "topsis";
  if (normalizedName === "FUZZY TOPSIS") return "fuzzy_topsis";
  if (normalizedName === "BORDA") return "borda";
  if (normalizedName === "ARAS") return "aras";

  if (
    normalizedName === "HERRERA-VIEDMA CRP" ||
    normalizedName === "HERRERA VIEDMA CRP" ||
    normalizedName === "CRP"
  ) {
    return "herrera_viedma_crp";
  }

  return null;
};