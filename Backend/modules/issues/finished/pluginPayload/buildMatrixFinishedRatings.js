import { createInternalError } from "../../../../utils/common/errors.js";
import { toIdString } from "../../../../utils/common/ids.js";
import { isPlainObject } from "../../../../utils/common/objects.js";

export const buildMatrixCellKey = (alternativeName, criterionName) =>
  `${alternativeName}::${criterionName}`;

export const buildCollectiveMatrixEvaluations = ({
  stageResult,
}) => {
  return isPlainObject(stageResult?.collectiveEvaluations)
    ? stageResult.collectiveEvaluations
    : {};
};

export const buildExpertAlternativeRatingsOrThrow = ({
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

    const cells = evaluation?.payload?.cells;
    if (!isPlainObject(cells)) {
      throw createInternalError("IssueEvaluation payload.cells is required", {
        field: "payload.cells",
        details: {
          issueId: toIdString(issueId),
          phase,
          expert: expertEmail,
        },
      });
    }

    const rows = {};

    for (const alternativeName of alternativeNames) {
      rows[alternativeName] = {};

      for (const criterionName of criterionNames) {
        const cellKey = buildMatrixCellKey(alternativeName, criterionName);
        const cell = cells[cellKey];

        if (!isPlainObject(cell)) {
          throw createInternalError("IssueEvaluation cell is required for finished ratings", {
            field: "payload.cells",
            details: {
              issueId: toIdString(issueId),
              phase,
              expert: expertEmail,
              cellKey,
            },
          });
        }

        const value = cell.value;
        if (value === "" || value === null || value === undefined) {
          throw createInternalError("IssueEvaluation cell value is required for finished ratings", {
            field: "payload.cells",
            details: {
              issueId: toIdString(issueId),
              phase,
              expert: expertEmail,
              cellKey,
            },
          });
        }

        rows[alternativeName][criterionName] = value;
      }
    }

    expertEvaluations[expertEmail] = rows;
  }

  return expertEvaluations;
};
