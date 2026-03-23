/**
 * Valida los datos finales de pesos BWM.
 *
 * @param {Object} bwmData Datos enviados.
 * @returns {{ valid: boolean, msg?: string, field?: string }}
 */
export const validateFinalWeights = (bwmData) => {
  if (!bwmData) {
    return { valid: false, msg: "Missing weight data" };
  }

  const { bestCriterion, worstCriterion, bestToOthers, othersToWorst } = bwmData;

  if (!bestCriterion || !worstCriterion) {
    return { valid: false, msg: "You must select both best and worst criteria" };
  }

  const criteria = Object.keys(bestToOthers || {});
  if (criteria.length === 0) {
    return { valid: false, msg: "No criteria found for evaluation" };
  }

  for (const criterion of criteria) {
    if (criterion === bestCriterion) continue;

    const value = Number(bestToOthers[criterion]);

    if (isNaN(value) || value < 1 || value > 9) {
      return {
        valid: false,
        field: criterion,
        msg: `Invalid value in best-to-others for ${criterion}`,
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
        msg: `Invalid value in others-to-worst for ${criterion}`,
      };
    }
  }

  return { valid: true };
};