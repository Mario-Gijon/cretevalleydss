import { findMatchingFuzzyLabel } from "../../../../../expressionDomains";
import { isPlainObject } from "../../../../../../utils/common/objects";
import { PAIRWISE_MAX_DECIMAL_PLACES } from "./numericPrecision";

const UNMATCHED_FUZZY_TOOLTIP =
  "No predefined label matches this derived inverse.";

const formatNumericValue = ({ value, maxDecimalPlaces }) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error("Numeric pairwise value is invalid.");
  }

  const text = Number.isInteger(maxDecimalPlaces) && maxDecimalPlaces >= 0
    ? String(value)
    : Number.parseFloat(value.toPrecision(12)).toString();
  const decimalIndex = text.indexOf(".");

  if (
    !Number.isInteger(maxDecimalPlaces) ||
    maxDecimalPlaces < 0 ||
    decimalIndex < 0
  ) {
    return text;
  }

  const fractionalPart = text.slice(decimalIndex + 1);

  if (fractionalPart.length <= maxDecimalPlaces) {
    return text;
  }

  if (maxDecimalPlaces === 0) {
    return `${text.slice(0, decimalIndex)}…`;
  }

  return `${text.slice(0, decimalIndex + maxDecimalPlaces + 1)}…`;
};

const resolveLabelText = ({ labelKey, expressionDomain }) => {
  const labels = Array.isArray(expressionDomain?.definition?.labels)
    ? expressionDomain.definition.labels
    : [];
  const label = labels.find((item) => item?.key === labelKey);

  if (!label) {
    throw new Error(`Unknown labelKey "${labelKey}".`);
  }

  return label.label;
};

export const formatValue = ({ value, expressionDomain }) => {
  if (value === "") {
    return {
      text: "",
      tooltip: null,
    };
  }

  switch (expressionDomain?.typeKey) {
    case "numericContinuous":
      return {
        text: formatNumericValue({
          value,
          maxDecimalPlaces: PAIRWISE_MAX_DECIMAL_PLACES,
        }),
        tooltip: null,
      };

    case "numericDiscrete":
      return {
        text: formatNumericValue({ value }),
        tooltip: null,
      };

    case "linguisticOrdinal":
      return {
        text: resolveLabelText({
          labelKey: value?.labelKey,
          expressionDomain,
        }),
        tooltip: null,
      };

    case "linguisticFuzzy": {
      if (isPlainObject(value) && typeof value.labelKey === "string") {
        return {
          text: resolveLabelText({
            labelKey: value.labelKey,
            expressionDomain,
          }),
          tooltip: null,
        };
      }

      if (isPlainObject(value) && Array.isArray(value.values)) {
        const matchingLabel = findMatchingFuzzyLabel({
          values: value.values,
          expressionDomain,
        });

        if (matchingLabel) {
          return {
            text: matchingLabel.label,
            tooltip: null,
          };
        }

        const text = `[${value.values
          .map((item) => Number.parseFloat(item.toPrecision(12)).toString())
          .join(", ")}]`;

        return {
          text,
          tooltip: UNMATCHED_FUZZY_TOOLTIP,
        };
      }

      throw new Error("Fuzzy pairwise value is invalid.");
    }

    default:
      throw new Error("Expression domain type is invalid.");
  }
};

export const getUnmatchedFuzzyTooltipText = () =>
  UNMATCHED_FUZZY_TOOLTIP;
