/**
 * @typedef {Object} ValidationMessageResult
 * @property {boolean} valid Indica si la validación es correcta.
 * @property {string} [message] Mensaje descriptivo, si existe.
 * @property {string} [field] Campo asociado al error, si existe.
 */

/**
 * Valida los datos finales de pesos BWM.
 *
 * @param {Object} bwmData Datos enviados.
 * @returns {ValidationMessageResult}
 */
export const validateFinalWeights = (bwmData) => {
  if (!bwmData) {
    return { valid: false, message: "Missing weight data" };
  }

  const { bestCriterion, worstCriterion, bestToOthers, othersToWorst } = bwmData;

  if (!bestCriterion || !worstCriterion) {
    return {
      valid: false,
      message: "You must select both best and worst criteria",
    };
  }

  const criteria = Object.keys(bestToOthers || {});

  if (criteria.length === 0) {
    return { valid: false, message: "No criteria found for evaluation" };
  }

  for (const criterion of criteria) {
    if (criterion === bestCriterion) continue;

    const value = Number(bestToOthers[criterion]);

    if (isNaN(value) || value < 1 || value > 9) {
      return {
        valid: false,
        field: criterion,
        message: `Invalid value in best-to-others for ${criterion}`,
      };
    }
  }

  for (const criterion of criteria) {
    if (criterion === worstCriterion) continue;

    const value = Number(othersToWorst[criterion]);

    if (isNaN(value) || value < 1 || value > 9) {
      return {
        valid: false,
        field: criterion,
        message: `Invalid value in others-to-worst for ${criterion}`,
      };
    }
  }

  return { valid: true, message: "" };
};
