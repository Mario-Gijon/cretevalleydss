import { createInternalError } from "../../utils/common/errors.js";
import { toIdString } from "../../utils/common/ids.js";

const requireCriterionNameOrThrow = ({ criterion, field }) => {
  if (typeof criterion.name !== "string" || criterion.name.trim() === "") {
    throw createInternalError("Leaf criterion name is invalid", {
      field,
      details: {
        criterionId: toIdString(criterion._id),
      },
    });
  }

  return criterion.name.trim();
};

export const buildExpressionDomainAssignmentsByCriterionOrThrow = ({
  leafCriteria,
  field = "expressionDomain",
}) => {
  const assignments = {};

  for (const criterion of leafCriteria) {
    const criterionName = requireCriterionNameOrThrow({
      criterion,
      field: "criteria.name",
    });

    const snapshotId = toIdString(criterion.expressionDomain);
    if (!snapshotId) {
      throw createInternalError(
        `Leaf criterion '${criterionName}' is missing expression domain snapshot`,
        {
          field,
          details: {
            criterionName,
            criterionId: toIdString(criterion._id),
          },
        }
      );
    }

    assignments[criterionName] = snapshotId;
  }

  return assignments;
};

export const buildExpressionDomainConfigFromLeafCriteriaOrThrow = ({
  leafCriteria,
  field = "expressionDomain",
}) => {
  const domainsByCriterion = buildExpressionDomainAssignmentsByCriterionOrThrow({
    leafCriteria,
    field,
  });

  const uniqueSnapshotIds = Array.from(
    new Set(Object.values(domainsByCriterion))
  );

  if (uniqueSnapshotIds.length === 0) {
    throw createInternalError("Leaf criteria expression domains are required", {
      field,
    });
  }

  if (uniqueSnapshotIds.length === 1) {
    return {
      mode: "global",
      globalDomainId: uniqueSnapshotIds[0],
    };
  }

  return {
    mode: "byCriterion",
    domainsByCriterion,
  };
};
