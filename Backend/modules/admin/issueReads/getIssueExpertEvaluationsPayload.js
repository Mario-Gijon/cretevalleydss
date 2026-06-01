import { IssueEvaluation } from "../../../models/IssueEvaluations.js";
import { IssueStageResult } from "../../../models/IssueStageResults.js";
import { Participation } from "../../../models/Participations.js";
import { User } from "../../../models/Users.js";

import {
  getOrderedAlternativesDb,
  getOrderedLeafCriteriaDb,
} from "../../issues/shared/ordering.js";

import { toIdString } from "../../../utils/common/ids.js";
import { isPlainObject } from "../../../utils/common/objects.js";
import {
  buildAdminExpertIdentityPayload,
  buildAdminExpertParticipationPayload,
  formatIssueSnapshotDomain,
  orderObjectByKeys,
} from "./adminIssueReadPayloads.js";
import {
  resolveExpectedEvaluationCellsPerExpert,
} from "./adminIssueProgress.js";
import {
  loadIssueForExpertEvaluationsOrThrow,
  validateIssueIdOrThrow,
  validateExpertIdOrThrow,
} from "./adminIssueReadLoaders.js";
import { createNotFoundError } from "../../../utils/common/errors.js";

const buildPairKey = (alternativeA, alternativeB) =>
  `${alternativeA}::${alternativeB}`;

const isFilledValue = (value) =>
  value !== null &&
  value !== undefined &&
  !(typeof value === "string" && value.trim() === "");

const buildCollectiveValueCell = (value) => ({
  value:
    value !== null && typeof value === "object" && !Array.isArray(value)
      ? value.value
      : value,
  expressionDomain: null,
});

const buildNeutralCollectiveCell = () => ({
  value: "Neutral",
  expressionDomain: null,
  isNeutralFallback: true,
});

const buildCollectivePairwiseRowsFromPairMap = ({
  criterionPairs,
  orderedAlternatives,
}) => {
  if (!isPlainObject(criterionPairs)) {
    return null;
  }

  return orderedAlternatives.map((rowAlternative) => {
    const row = { id: rowAlternative };

    for (const colAlternative of orderedAlternatives) {
      if (rowAlternative === colAlternative) {
        row[colAlternative] = buildNeutralCollectiveCell();
        continue;
      }

      row[colAlternative] = buildCollectiveValueCell(
        criterionPairs[buildPairKey(rowAlternative, colAlternative)]
      );
    }

    return row;
  });
};

const buildCollectivePairwiseRowsFromMatrix = ({
  criterionMatrix,
  orderedAlternatives,
}) => {
  if (!Array.isArray(criterionMatrix)) {
    return null;
  }

  return orderedAlternatives.map((rowAlternative, rowIndex) => {
    const row = { id: rowAlternative };
    const sourceRow = Array.isArray(criterionMatrix[rowIndex])
      ? criterionMatrix[rowIndex]
      : [];

    for (const [colIndex, colAlternative] of orderedAlternatives.entries()) {
      if (rowAlternative === colAlternative) {
        row[colAlternative] = buildNeutralCollectiveCell();
        continue;
      }

      row[colAlternative] = buildCollectiveValueCell(sourceRow[colIndex]);
    }

    return row;
  });
};

const buildCollectivePairwiseRowsFromRows = ({
  criterionRows,
  orderedAlternatives,
}) => {
  if (!Array.isArray(criterionRows)) {
    return null;
  }

  const rowMap = new Map(
    criterionRows
      .filter((row) => isPlainObject(row) && typeof row.id === "string")
      .map((row) => [row.id, row])
  );

  if (rowMap.size === 0) {
    return null;
  }

  return orderedAlternatives.map((rowAlternative) => {
    const row = { id: rowAlternative };
    const sourceRow = rowMap.get(rowAlternative) || {};

    for (const colAlternative of orderedAlternatives) {
      if (rowAlternative === colAlternative) {
        row[colAlternative] = buildNeutralCollectiveCell();
        continue;
      }

      row[colAlternative] = buildCollectiveValueCell(sourceRow[colAlternative]);
    }

    return row;
  });
};

const normalizeAdminPairwiseCollectiveEvaluations = ({
  source,
  orderedAlternatives,
  orderedLeafCriteria,
}) => {
  if (!isPlainObject(source)) {
    return null;
  }

  const normalized = {};

  for (const criterion of orderedLeafCriteria) {
    const criterionName = criterion?.name;
    if (!criterionName) {
      continue;
    }

    const criterionSource = source[criterionName];
    let rows = null;

    if (Array.isArray(criterionSource)) {
      rows =
        criterionSource.length > 0 &&
          isPlainObject(criterionSource[0]) &&
          "id" in criterionSource[0]
          ? buildCollectivePairwiseRowsFromRows({
            criterionRows: criterionSource,
            orderedAlternatives,
          })
          : buildCollectivePairwiseRowsFromMatrix({
            criterionMatrix: criterionSource,
            orderedAlternatives,
          });
    } else if (isPlainObject(criterionSource)) {
      rows = buildCollectivePairwiseRowsFromPairMap({
        criterionPairs: criterionSource,
        orderedAlternatives,
      });
    }

    if (rows) {
      normalized[criterionName] = rows;
    }
  }

  return Object.keys(normalized).length > 0 ? normalized : null;
};

export const getIssueExpertEvaluationsPayload = async ({
  issueId,
  expertId,
}) => {
  validateIssueIdOrThrow(issueId);
  validateExpertIdOrThrow(expertId);
  const issue = await loadIssueForExpertEvaluationsOrThrow({ issueId });

  const [
    expert,
    participation,
    latestAlternativeStageResult,
    orderedAlternatives,
    orderedLeafCriteria,
    evaluationDoc,
  ] = await Promise.all([
    User.findById(expertId)
      .select("name email role university accountConfirm")
      .lean(),
    Participation.findOne({ issue: issueId, expert: expertId }).lean(),
    IssueStageResult.findOne({
      issue: issueId,
      stage: "alternativeEvaluation",
    })
      .sort({ consensusPhase: -1 })
      .lean(),
    getOrderedAlternativesDb({
      issueId,
      issueDoc: issue,
      select: "_id name",
      lean: true,
    }),
    getOrderedLeafCriteriaDb({
      issueId,
      issueDoc: issue,
      select: "_id name type",
      lean: true,
    }),
    IssueEvaluation.findOne({
      issue: issueId,
      expert: expertId,
      stage: "alternativeEvaluation",
    })
      .sort({ consensusPhase: -1 })
      .lean(),
  ]);

  if (!participation && !expert && !evaluationDoc) {
    throw createNotFoundError("Expert data for this issue not found", {
      field: "expertId",
    });
  }

  const alternativeEvaluationStructureKey = issue.alternativeEvaluationStructureKey;
  const evaluationPayload = evaluationDoc?.payload || {};
  const lastEvaluationAt = evaluationDoc?.submittedAt || null;
  const consensusPhase = evaluationDoc?.consensusPhase ?? null;
  const collectiveSource =
    latestAlternativeStageResult?.collectiveEvaluations || null;
  const expectedCells = await resolveExpectedEvaluationCellsPerExpert({
    issue,
    alternatives: orderedAlternatives,
    criteria: orderedLeafCriteria,
  });

  const usesPairwiseAlternatives =
    alternativeEvaluationStructureKey ===
    "alternativePairwiseByCriterion";

  if (usesPairwiseAlternatives) {
    const comparisonsByCriterion =
      evaluationPayload.comparisonsByCriterion || {};

    const evaluations = {};
    const orderedAlternativeNames = orderedAlternatives.map(
      (alternative) => alternative.name
    );

    let filledCells = 0;
    const normalizedPairwiseCollectiveEvaluations =
      normalizeAdminPairwiseCollectiveEvaluations({
        source: collectiveSource,
        orderedAlternatives: orderedAlternativeNames,
        orderedLeafCriteria,
      });

    for (const criterion of orderedLeafCriteria) {
      const criterionComparisons =
        comparisonsByCriterion?.[criterion.name] || {};

      evaluations[criterion.name] = orderedAlternatives.map((alternative) => {
        const row = {
          id: alternative.name,
        };

        for (const comparedAlternative of orderedAlternatives) {
          if (alternative.name === comparedAlternative.name) {
            continue;
          }

          const pairKey = `${alternative.name}::${comparedAlternative.name}`;
          const cell = criterionComparisons?.[pairKey];

          row[comparedAlternative.name] = {
            value: cell?.value,
            domain: formatIssueSnapshotDomain(cell?.expressionDomain),
            timestamp: lastEvaluationAt,
            consensusPhase,
          };

          if (isFilledValue(cell?.value)) {
            filledCells += 1;
          }
        }

        return orderObjectByKeys(row, ["id", ...orderedAlternativeNames]);
      });
    }

    return {
      issue: {
        id: toIdString(issue._id),
        name: issue.name,
        currentStage: issue.currentStage,
        weightingMode: issue.weightingMode,
        active: issue.active,
        alternativeEvaluationStructureKey: issue.alternativeEvaluationStructureKey,
        criteriaWeightingStructureKey: issue.criteriaWeightingStructureKey,
      },
      expert: buildAdminExpertIdentityPayload(expert, expertId),
      participation: buildAdminExpertParticipationPayload(participation),
      stats: {
        expectedCells,
        filledCells,
        lastEvaluationAt,
      },
      evaluations,
      collectiveEvaluations: normalizedPairwiseCollectiveEvaluations,
    };
  }

  const cells = evaluationPayload.cells || {};
  const evaluations = {};
  let filledCells = 0;

  for (const alternative of orderedAlternatives) {
    evaluations[alternative.name] = {};

    for (const criterion of orderedLeafCriteria) {
      const cellKey = `${alternative.name}::${criterion.name}`;
      const cell = cells?.[cellKey];

      evaluations[alternative.name][criterion.name] = {
        value: cell?.value,
        domain: formatIssueSnapshotDomain(cell?.expressionDomain),
        timestamp: lastEvaluationAt,
        consensusPhase,
      };

      if (isFilledValue(cell?.value)) {
        filledCells += 1;
      }
    }
  }

  return {
    issue: {
      id: toIdString(issue._id),
      name: issue.name,
      currentStage: issue.currentStage,
      weightingMode: issue.weightingMode,
      active: issue.active,
      alternativeEvaluationStructureKey: issue.alternativeEvaluationStructureKey,
      criteriaWeightingStructureKey: issue.criteriaWeightingStructureKey,
    },
    expert: buildAdminExpertIdentityPayload(expert, expertId),
    participation: buildAdminExpertParticipationPayload(participation),
    stats: {
      expectedCells,
      filledCells,
      lastEvaluationAt,
    },
    evaluations,
    collectiveEvaluations: isPlainObject(collectiveSource)
      ? collectiveSource
      : null,
  };
};
