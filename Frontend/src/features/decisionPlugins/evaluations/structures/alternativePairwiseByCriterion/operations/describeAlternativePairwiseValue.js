import { findMatchingFuzzyLabel } from "../../../../../expressionDomains";
import { requireCanonicalPairwiseCell } from "./validateAlternativePairwiseEvaluation";

const UNMATCHED_FUZZY_TOOLTIP = "No predefined label matches this derived inverse.";

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const formatNumericValue = (value) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error("Numeric pairwise value is invalid.");
  }

  return Number.parseFloat(value.toPrecision(12)).toString();
};

const resolveLabelTextOrThrow = ({ labelKey, expressionDomain }) => {
  const labels = Array.isArray(expressionDomain?.definition?.labels)
    ? expressionDomain.definition.labels
    : null;

  if (!labels) {
    throw new Error("Expression domain definition is invalid.");
  }

  const label = labels.find((item) => item?.key === labelKey);

  if (!label) {
    throw new Error(`Unknown labelKey "${labelKey}".`);
  }

  return label.label;
};

export const describePairwiseCellValue = ({ cell, expressionDomain }) => {
  const value = requireCanonicalPairwiseCell({
    cell,
    field: "cell",
  }).value;

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
        text: resolveLabelTextOrThrow({
          labelKey: value?.labelKey,
          expressionDomain,
        }),
        tooltip: null,
      };

    case "linguisticFuzzy":
      if (isPlainObject(value) && typeof value.labelKey === "string") {
        return {
          text: resolveLabelTextOrThrow({
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

        return {
          text: `[${value.values
            .map((item) => Number.parseFloat(item.toPrecision(12)).toString())
            .join(", ")}]`,
          tooltip: UNMATCHED_FUZZY_TOOLTIP,
        };
      }

      throw new Error("Fuzzy pairwise value is invalid.");

    default:
      throw new Error("Expression domain type is invalid.");
  }
};

export const getUnmatchedFuzzyTooltipText = () => UNMATCHED_FUZZY_TOOLTIP;
