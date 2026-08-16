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

  if (
    expressionDomain?.typeKey === "linguistic2Tuple" &&
    collectiveValue &&
    typeof collectiveValue === "object" &&
    !Array.isArray(collectiveValue)
  ) {
    const labelKey = collectiveValue.labelKey;
    const domainLabel = expressionDomain.definition?.labels?.find(
      (item) => item?.key === labelKey,
    );
    const label = domainLabel?.label || (typeof labelKey === "string" ? labelKey : "—");
    const alpha = Number.isFinite(collectiveValue.alpha)
      ? formatCollectiveDisplayValue(collectiveValue.alpha)
      : "—";
    const formattedValue = `${label} (α = ${alpha})`;

    return {
      label: formattedValue,
      title: formattedValue,
    };
  }

  return {
    label: formattedVector,
    title: undefined,
  };
};
