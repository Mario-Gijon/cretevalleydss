import { findMatchingFuzzyLabel } from "../../../../../expressionDomains";
import { formatCollectiveDisplayValue } from "../../../shared/formatCollectiveDisplayValue";
import { formatValue } from "./formatValue";

export const formatCollectiveValue = ({
  collectiveValue,
  expressionDomain,
}) => {
  if (
    expressionDomain?.typeKey === "linguisticFuzzy" &&
    Array.isArray(collectiveValue)
  ) {
    const matchingLabel = findMatchingFuzzyLabel({
      values: collectiveValue,
      expressionDomain,
    });
    const vector = formatCollectiveDisplayValue(collectiveValue);

    return {
      label: matchingLabel?.label || vector,
      title: matchingLabel ? `${matchingLabel.label} — ${vector}` : vector,
    };
  }

  if (
    expressionDomain?.typeKey === "linguisticOrdinal" ||
    expressionDomain?.typeKey === "linguisticFuzzy"
  ) {
    const presentation = formatValue({
      value: collectiveValue,
      expressionDomain,
    });

    return {
      label: presentation.text,
      title: presentation.tooltip || undefined,
    };
  }

  const label = formatCollectiveDisplayValue(collectiveValue);

  return {
    label,
    title: Array.isArray(collectiveValue) ? label : undefined,
  };
};
