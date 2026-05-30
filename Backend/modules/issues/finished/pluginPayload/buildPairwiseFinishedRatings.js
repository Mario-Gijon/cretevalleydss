import { createInternalError } from "../../../../utils/common/errors.js";
import { toIdString } from "../../../../utils/common/ids.js";
import { isPlainObject } from "../../../../utils/common/objects.js";

export const buildPairKey = (alternativeA, alternativeB) =>
  `${alternativeA}::${alternativeB}`;

export const buildPairwiseRowsForCriterionOrThrow = ({
  criterionComparisons,
  criterionName,
  alternativeNames,
  issueId,
  phase,
  expert,
}) => {
  if (!isPlainObject(criterionComparisons)) {
    throw createInternalError(
      "Pairwise criterion comparisons are required for finished ratings",
      {
        field: "payload.comparisonsByCriterion",
        details: {
          issueId: toIdString(issueId),
          phase,
          criterionName,
          expert,
        },
      }
    );
  }

  const rows = [];

  for (const rowAlternative of alternativeNames) {
    const row = { id: rowAlternative };

    for (const colAlternative of alternativeNames) {
      if (rowAlternative === colAlternative) {
        row[colAlternative] = {
          value: "Neutral",
          expressionDomain: null,
          isNeutralFallback: true,
        };
        continue;
      }

      const pairKey = buildPairKey(rowAlternative, colAlternative);
      const cell = criterionComparisons[pairKey];

      if (!isPlainObject(cell)) {
        throw createInternalError(
          "Pairwise comparison cell is required for finished ratings",
          {
            field: "payload.comparisonsByCriterion",
            details: {
              issueId: toIdString(issueId),
              phase,
              criterionName,
              expert,
              pairKey,
            },
          }
        );
      }

      if (cell.value === "" || cell.value === null || cell.value === undefined) {
        throw createInternalError(
          "Pairwise comparison value is required for finished ratings",
          {
            field: "payload.comparisonsByCriterion",
            details: {
              issueId: toIdString(issueId),
              phase,
              criterionName,
              expert,
              pairKey,
            },
          }
        );
      }

      row[colAlternative] = {
        value: cell.value,
        expressionDomain: cell.expressionDomain ?? null,
      };
    }

    rows.push(row);
  }

  return rows;
};

export const buildExpertPairwiseRatingsOrThrow = ({
  evaluations,
  alternativeNames,
  criterionNames,
  issueId,
  phase,
}) => {
  const expertEvaluations = {};

  for (const evaluation of evaluations) {
    const expertId = toIdString(evaluation?.expert?._id || evaluation?.expert);
    const expertEmailRaw = evaluation?.expert?.email;
    const expertEmail =
      typeof expertEmailRaw === "string" && expertEmailRaw.trim()
        ? expertEmailRaw.trim()
        : `expert_${expertId || "unknown"}`;

    const comparisonsByCriterion = evaluation?.payload?.comparisonsByCriterion;
    if (!isPlainObject(comparisonsByCriterion)) {
      throw createInternalError(
        "IssueEvaluation payload.comparisonsByCriterion is required",
        {
          field: "payload.comparisonsByCriterion",
          details: {
            issueId: toIdString(issueId),
            phase,
            expert: expertEmail,
          },
        }
      );
    }

    const expertCriteriaMatrices = {};

    for (const criterionName of criterionNames) {
      expertCriteriaMatrices[criterionName] = buildPairwiseRowsForCriterionOrThrow({
        criterionComparisons: comparisonsByCriterion[criterionName],
        criterionName,
        alternativeNames,
        issueId,
        phase,
        expert: expertEmail,
      });
    }

    expertEvaluations[expertEmail] = expertCriteriaMatrices;
  }

  return expertEvaluations;
};

export const resolveCollectivePairwiseSource = (stageResult) => {
  return isPlainObject(stageResult?.collectiveEvaluations)
    ? stageResult.collectiveEvaluations
    : null;
};

export const resolveCollectivePairwiseMatrixForCriterion = ({
  source,
  criterionName,
}) => {
  const byCriterion = source?.[criterionName];
  if (Array.isArray(byCriterion)) {
    return byCriterion;
  }
  return null;
};

export const buildCollectivePairwiseRowsFromPairMap = ({
  criterionPairs,
  alternativeNames,
}) => {
  if (!isPlainObject(criterionPairs)) {
    return null;
  }

  const rows = [];

  for (const rowAlternative of alternativeNames) {
    const row = { id: rowAlternative };

    for (const colAlternative of alternativeNames) {
      if (rowAlternative === colAlternative) {
        row[colAlternative] = {
          value: "Neutral",
          expressionDomain: null,
          isNeutralFallback: true,
        };
        continue;
      }

      const pairKey = buildPairKey(rowAlternative, colAlternative);
      const cell = criterionPairs[pairKey];
      const value = isPlainObject(cell) ? cell.value : cell;

      row[colAlternative] = {
        value:
          value === null || value === undefined || value === ""
            ? ""
            : value,
        expressionDomain: null,
      };
    }

    rows.push(row);
  }

  return rows.length > 0 ? rows : null;
};

export const buildCollectivePairwiseEvaluations = ({
  stageResult,
  alternativeNames,
  criterionNames,
}) => {
  const source = resolveCollectivePairwiseSource(stageResult);
  if (!isPlainObject(source)) {
    return null;
  }

  const collectiveEvaluations = {};

  for (const criterionName of criterionNames) {
    const criterionCollective = source?.[criterionName];

    if (isPlainObject(criterionCollective)) {
      const rowsFromPairMap = buildCollectivePairwiseRowsFromPairMap({
        criterionPairs: criterionCollective,
        alternativeNames,
      });

      if (rowsFromPairMap) {
        collectiveEvaluations[criterionName] = rowsFromPairMap;
      }
      continue;
    }

    const matrix = resolveCollectivePairwiseMatrixForCriterion({
      source,
      criterionName,
    });
    if (!Array.isArray(matrix)) {
      continue;
    }

    const rows = [];

    for (let rowIndex = 0; rowIndex < alternativeNames.length; rowIndex += 1) {
      const rowAlternative = alternativeNames[rowIndex];
      const sourceRow = matrix[rowIndex];

      if (!Array.isArray(sourceRow)) {
        continue;
      }

      const row = { id: rowAlternative };

      for (let colIndex = 0; colIndex < alternativeNames.length; colIndex += 1) {
        const colAlternative = alternativeNames[colIndex];

        if (rowAlternative === colAlternative) {
          row[colAlternative] = {
            value: "Neutral",
            expressionDomain: null,
            isNeutralFallback: true,
          };
          continue;
        }

        row[colAlternative] = {
          value: sourceRow[colIndex] ?? "",
          expressionDomain: null,
        };
      }

      rows.push(row);
    }

    collectiveEvaluations[criterionName] = rows;
  }

  return Object.keys(collectiveEvaluations).length > 0
    ? collectiveEvaluations
    : null;
};
