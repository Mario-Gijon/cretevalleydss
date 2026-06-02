import { toIdString } from "../../../../../utils/common/ids.js";
import { isPlainObject } from "../../../../../utils/common/objects.js";
import { buildCellKey } from "./matrixContext.js";

const formatIssueSnapshotDomain = (domain) => {
  if (!domain) {
    return null;
  }

  return {
    id: toIdString(domain._id),
    name: domain.name,
    type: domain.type,
    ...(domain.type === "numeric" && {
      range: {
        min: domain.numericRange?.min ?? null,
        max: domain.numericRange?.max ?? null,
      },
    }),
    ...(domain.type === "linguistic" && {
      labels: domain.linguisticLabels,
    }),
  };
};

const isFilledValue = (value) =>
  !(value === null || value === undefined || value === "");

export const buildProgressMeta = ({ storedEvaluation, alternativeNames, criteria }) => {
  const storedCells =
    isPlainObject(storedEvaluation?.payload?.cells)
      ? storedEvaluation.payload.cells
      : {};

  const totalItems = Object.keys(storedCells).length;
  const filledItems = Object.values(storedCells).filter((cell) =>
    isFilledValue(cell?.value)
  ).length;

  const expectedItems =
    alternativeNames.length > 0 && criteria.length > 0
      ? alternativeNames.length * criteria.length
      : 0;

  return {
    progress: {
      expectedItems,
      totalItems,
      filledItems,
    },
  };
};

export const buildDisplayMeta = ({
  alternativeNames,
  criteria,
  storedEvaluation,
  collectiveEvaluations,
}) => {
  const sourceCells = isPlainObject(storedEvaluation?.payload?.cells)
    ? storedEvaluation.payload.cells
    : {};
  const lastEvaluationAt = storedEvaluation?.submittedAt || null;
  const consensusPhase = storedEvaluation?.consensusPhase ?? null;

  const evaluations = {};

  for (const alternativeName of alternativeNames) {
    evaluations[alternativeName] = {};

    for (const criterion of criteria) {
      const criterionName = criterion.name;
      const cellKey = buildCellKey(alternativeName, criterionName);
      const cell = sourceCells[cellKey];

      evaluations[alternativeName][criterionName] = {
        value: cell?.value,
        domain: formatIssueSnapshotDomain(cell?.expressionDomain),
        timestamp: lastEvaluationAt,
        consensusPhase,
      };
    }
  }

  return {
    evaluations,
    collectiveEvaluations: isPlainObject(collectiveEvaluations)
      ? collectiveEvaluations
      : null,
  };
};
