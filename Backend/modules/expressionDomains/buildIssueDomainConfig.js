import { createInternalError } from "../../utils/common/errors.js";
import { toIdString } from "../../utils/common/ids.js";

const normalizeCriterionName = (criterion) => String(criterion?.name || "").trim();

export const buildExpressionDomainAssignmentsByCriterionOrThrow = ({
  leafCriteria,
  field = "expressionDomain",
}) => {
  const criteriaList = Array.isArray(leafCriteria) ? leafCriteria : [];
  const assignments = {};

  for (const criterion of criteriaList) {
    const criterionName = normalizeCriterionName(criterion);
    if (!criterionName) {
      continue;
    }

    const snapshotId = toIdString(criterion?.expressionDomain);
    if (!snapshotId) {
      throw createInternalError(
        `Leaf criterion '${criterionName}' is missing expression domain snapshot`,
        {
          field,
          details: {
            criterionName,
            criterionId: toIdString(criterion?._id),
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
    new Set(Object.values(domainsByCriterion).filter(Boolean))
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
