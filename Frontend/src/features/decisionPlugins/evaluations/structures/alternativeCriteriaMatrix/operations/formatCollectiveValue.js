import { findMatchingFuzzyLabel } from "../../../../../expressionDomains";
import { formatCollectiveDisplayValue } from "../../../shared/formatCollectiveDisplayValue";

export const formatCollectiveValue = ({
  collectiveValue,
  expressionDomain,
}) => {
  const formattedVector = formatCollectiveDisplayValue(collectiveValue);

  if (
    expressionDomain?.typeKey === "linguisticFuzzy" &&
    Array.isArray(collectiveValue)
  ) {
    const matchingLabel = findMatchingFuzzyLabel({
      values: collectiveValue,
      expressionDomain,
    });

    if (matchingLabel?.label) {
      return {
        label: matchingLabel.label,
        title: `${matchingLabel.label} — ${formattedVector}`,
      };
    }

    return {
      label: formattedVector,
      title: formattedVector,
    };
  }

  return {
    label: formattedVector,
    title: undefined,
  };
};
