/**
 * Valida evaluaciones directas alternativa x criterio.
 *
 * @param {Object} evaluations
 * @param {Object} options
 * @param {string[]} options.leafCriteria
 * @param {boolean} options.allowEmpty
 * @returns {{valid: boolean, error?: Object, message: string}}
 */
export const validateDirectEvaluations = (
  evaluations,
  { leafCriteria = [], allowEmpty = false } = {}
) => {
  let firstInvalidCell = null;

  for (const alternativeName in evaluations) {
    const criteriaEvaluations = evaluations[alternativeName];

    for (const criterionName in criteriaEvaluations) {
      if (leafCriteria.length > 0 && !leafCriteria.includes(criterionName)) {
        continue;
      }

      const { value, domain } = criteriaEvaluations[criterionName] || {};

      if (!allowEmpty) {
        if (value === "" || value === null || value === undefined) {
          firstInvalidCell = {
            alternative: alternativeName,
            criterion: criterionName,
            message: `Cell [${alternativeName}, ${criterionName}] must be evaluated.`,
          };
          break;
        }
      }

      if (value !== "" && value !== null && value !== undefined) {
        if (domain?.type === "numeric") {
          const min = domain.range?.min ?? 0;
          const max = domain.range?.max ?? 1;

          if (isNaN(value) || value < min || value > max) {
            firstInvalidCell = {
              alternative: alternativeName,
              criterion: criterionName,
              message: `Invalid value for [${alternativeName}, ${criterionName}]. Must be between ${min} and ${max}.`,
            };
            break;
          }

          const roundedValue = Math.round(value * 100) / 100;
          if (value !== roundedValue) {
            firstInvalidCell = {
              alternative: alternativeName,
              criterion: criterionName,
              message: `Value for [${alternativeName}, ${criterionName}] must have at most two decimals.`,
            };
            break;
          }
        } else if (domain?.type === "linguistic") {
          const validLabels = domain.labels?.map((label) => label.label) || [];

          if (!validLabels.includes(value)) {
            firstInvalidCell = {
              alternative: alternativeName,
              criterion: criterionName,
              message: `Invalid label for [${alternativeName}, ${criterionName}]. Must be one of: ${validLabels.join(", ")}.`,
            };
            break;
          }
        }
      }
    }

    if (firstInvalidCell) {
      break;
    }
  }

  return firstInvalidCell
    ? { valid: false, error: firstInvalidCell }
    : { valid: true, message: "" };
};