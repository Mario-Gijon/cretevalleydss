export const buildModelParameterContext = ({
  leafCriteria = [],
  leafNames = [],
  alternatives = [],
}) => {
  return {
    leafCriteria,
    leafCriteriaCount: leafCriteria.length,
    leafNames,
    alternatives,
    alternativesCount: alternatives.length,
  };
};
