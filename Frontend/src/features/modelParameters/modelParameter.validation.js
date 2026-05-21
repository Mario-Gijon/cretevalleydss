import { resolveModelParameterAdapter } from "./modelParameter.registry";
import {
  CRITERIA_WEIGHTS_SUM_TOLERANCE,
  validateCriteriaWeightsValue,
  validateCriteriaWeightsParameterValue,
} from "./fields/criteriaWeights/criteriaWeights.validation";

export {
  CRITERIA_WEIGHTS_SUM_TOLERANCE,
  validateCriteriaWeightsValue,
  validateCriteriaWeightsParameterValue,
};

export const validateModelParameterValue = ({
  parameter,
  value,
  leafCount,
  leafCriteria = [],
}) => {
  const { adapter } = resolveModelParameterAdapter(parameter);

  if (!adapter?.validate) {
    return { isValid: true };
  }

  return adapter.validate({ parameter, value, leafCount, leafCriteria });
};
