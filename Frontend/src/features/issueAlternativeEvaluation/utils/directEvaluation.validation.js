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
  const alignToStep = ({ value, min, max, step }) => {
    if (!Number.isFinite(step) || step <= 0) {
      return Math.round(value * 100) / 100;
    }

    const snapped = min + Math.round((value - min) / step) * step;
    const bounded = Math.min(max, Math.max(min, snapped));

    return Math.round(bounded * 100) / 100;
  };

  const isStepAligned = ({ value, min, max, step }) => {
    if (!Number.isFinite(step) || step <= 0) {
      return true;
    }

    const aligned = alignToStep({ value, min, max, step });
    return Math.abs(aligned - value) < 1e-9;
  };

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
          const min = Number(domain?.range?.min ?? 0);
          const max = Number(domain?.range?.max ?? 1);
          const step = Number(domain?.range?.step);
          const numericValue = Number(value);

          if (isNaN(numericValue) || numericValue < min || numericValue > max) {
            firstInvalidCell = {
              alternative: alternativeName,
              criterion: criterionName,
              message: `Invalid value for [${alternativeName}, ${criterionName}]. Must be between ${min} and ${max}.`,
            };
            break;
          }

          if (
            !isStepAligned({
              value: numericValue,
              min,
              max,
              step,
            })
          ) {
            firstInvalidCell = {
              alternative: alternativeName,
              criterion: criterionName,
              message: `Value for [${alternativeName}, ${criterionName}] must follow step ${step}.`,
            };
            break;
          }

          const roundedValue = Math.round(numericValue * 100) / 100;
          if (numericValue !== roundedValue) {
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
