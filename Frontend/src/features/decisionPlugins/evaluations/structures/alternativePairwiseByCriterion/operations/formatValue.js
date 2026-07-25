import { findMatchingFuzzyLabel } from "../../../../../expressionDomains";
import { isPlainObject } from "../../../../../../utils/common/objects";

const UNMATCHED_FUZZY_TOOLTIP =
  "No predefined label matches this derived inverse.";

const formatNumericValue = (value) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error("Numeric pairwise value is invalid.");
  }

  return Number.parseFloat(value.toPrecision(12)).toString();
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
    case "numericDiscrete":
      return {
        text: formatNumericValue(value),
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
