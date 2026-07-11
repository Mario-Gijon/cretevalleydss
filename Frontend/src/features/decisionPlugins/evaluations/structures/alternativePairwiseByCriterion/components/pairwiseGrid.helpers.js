import { findMatchingFuzzyLabel, reflectExpressionDomainValue } from "../../../../../expressionDomains/operations/index.js";

const UNMATCHED_FUZZY_TOOLTIP = "No predefined label matches this derived inverse.";

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export const buildEmptyPairwiseCell = () => ({
  value: "",
});

const requireCanonicalPairwiseCell = ({ cell, field }) => {
  if (!isPlainObject(cell)) {
    throw new Error(`${field} must be a canonical pairwise cell object.`);
  }

  const keys = Object.keys(cell);

  if (keys.length !== 1 || !Object.prototype.hasOwnProperty.call(cell, "value")) {
    throw new Error(`${field} must contain exactly the key "value".`);
  }

  if (cell.value === null || cell.value === undefined) {
    throw new Error(`${field}.value is invalid.`);
  }

  return cell;
};

export const requireCanonicalPairwiseEvaluations = ({
  alternatives,
  evaluations,
}) => {
  if (!isPlainObject(evaluations)) {
    throw new Error("Pairwise evaluations must be an object.");
  }

  const alternativeIds = alternatives.map((alternative) => alternative.id);
  const rowKeys = Object.keys(evaluations);
  const unknownRows = rowKeys.filter((rowId) => !alternativeIds.includes(rowId));

  if (unknownRows.length > 0) {
    throw new Error("Pairwise evaluations contain unknown rows.");
  }

  for (const rowAlternative of alternatives) {
    if (!Object.prototype.hasOwnProperty.call(evaluations, rowAlternative.id)) {
      throw new Error(`Pairwise evaluations are missing row "${rowAlternative.id}".`);
    }

    const row = evaluations[rowAlternative.id];

    if (!isPlainObject(row)) {
      throw new Error(`Pairwise row "${rowAlternative.id}" must be an object.`);
    }

    const columnKeys = Object.keys(row);
    const allowedColumnIds = alternativeIds.filter((alternativeId) => alternativeId !== rowAlternative.id);
    const unknownColumns = columnKeys.filter(
      (columnId) => !allowedColumnIds.includes(columnId)
    );

    if (unknownColumns.length > 0) {
      if (unknownColumns.includes(rowAlternative.id)) {
        throw new Error(`Pairwise row "${rowAlternative.id}" must not contain a diagonal cell.`);
      }

      throw new Error(`Pairwise row "${rowAlternative.id}" contains unknown columns.`);
    }

    for (const columnAlternative of alternatives) {
      if (columnAlternative.id === rowAlternative.id) {
        continue;
      }

      if (!Object.prototype.hasOwnProperty.call(row, columnAlternative.id)) {
        throw new Error(
          `Pairwise row "${rowAlternative.id}" is missing column "${columnAlternative.id}".`
        );
      }

      requireCanonicalPairwiseCell({
        cell: row[columnAlternative.id],
        field: `evaluations.${rowAlternative.id}.${columnAlternative.id}`,
      });
    }
  }

  return evaluations;
};

export const updatePairwiseEvaluations = ({
  alternatives,
  evaluations,
  rowAlternativeId,
  columnAlternativeId,
  nextValue,
  expressionDomain,
}) => {
  const canonicalEvaluations = requireCanonicalPairwiseEvaluations({
    alternatives,
    evaluations,
  });
  const rowIndex = alternatives.findIndex((alternative) => alternative.id === rowAlternativeId);
  const columnIndex = alternatives.findIndex(
    (alternative) => alternative.id === columnAlternativeId
  );

  if (rowIndex < 0 || columnIndex < 0) {
    throw new Error("Pairwise update references an unknown alternative.");
  }

  if (rowIndex === columnIndex) {
    throw new Error("Pairwise updates cannot target diagonal cells.");
  }

  if (rowIndex > columnIndex) {
    throw new Error("Pairwise updates can only target upper-triangle cells.");
  }

  const nextEvaluations = structuredClone(canonicalEvaluations);

  if (nextValue === "") {
    nextEvaluations[rowAlternativeId][columnAlternativeId] = buildEmptyPairwiseCell();
    nextEvaluations[columnAlternativeId][rowAlternativeId] = buildEmptyPairwiseCell();
    return nextEvaluations;
  }

  nextEvaluations[rowAlternativeId][columnAlternativeId] = {
    value: nextValue,
  };

  try {
    nextEvaluations[columnAlternativeId][rowAlternativeId] = {
      value: reflectExpressionDomainValue({
        value: nextValue,
        expressionDomain,
      }),
    };
  } catch {
    nextEvaluations[columnAlternativeId][rowAlternativeId] = buildEmptyPairwiseCell();
  }

  return nextEvaluations;
};

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
