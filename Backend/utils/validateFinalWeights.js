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

  // Verificamos que todos los valores estén entre 1 y 9 (excepto best/worst = 1)
  for (const crit of criteria) {
    if (crit !== bestCriterion) {
      const val = Number(bestToOthers[crit]);
      if (isNaN(val) || val < 1 || val > 9) {
        return { valid: false, field: crit, msg: `Invalid value in best-to-others for ${crit}` };
      }
    }
  }

  for (const crit of criteria) {
    if (crit !== worstCriterion) {
      const val = Number(othersToWorst[crit]);
      if (isNaN(val) || val < 1 || val > 9) {
        return { valid: false, field: crit, msg: `Invalid value in others-to-worst for ${crit}` };
      }
    }
  }

  return { valid: true };
};
