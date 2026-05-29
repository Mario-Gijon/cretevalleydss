import {
  getOrderedAlternativesDb,
  getOrderedLeafCriteriaDb,
} from "../../../../issues/issue.ordering.js";
import { IssueExpressionDomain } from "../../../../../models/IssueExpressionDomains.js";
import { createBadRequestError } from "../../../../../utils/common/errors.js";
import { toIdString } from "../../../../../utils/common/ids.js";

export const getOrderedAlternativeAndCriterionNames = async ({ issue }) => {
  const [alternatives, criteria] = await Promise.all([
    getOrderedAlternativesDb({
      issueId: issue?._id,
      issueDoc: issue,
      select: "_id name",
      lean: true,
    }),
    getOrderedLeafCriteriaDb({
      issueId: issue?._id,
      issueDoc: issue,
      select: "_id name type expressionDomain",
      lean: true,
    }),
  ]);

  if (!Array.isArray(alternatives) || alternatives.length === 0) {
    throw createBadRequestError("Issue has no alternatives", {
      field: "alternatives",
    });
  }

  if (!Array.isArray(criteria) || criteria.length === 0) {
    throw createBadRequestError("Issue has no leaf criteria", {
      field: "criteria",
    });
  }

  const criteriaWithMissingSnapshot = criteria.filter(
    (criterion) => !toIdString(criterion?.expressionDomain)
  );
  if (criteriaWithMissingSnapshot.length > 0) {
    throw createBadRequestError("Each leaf criterion must have an expression domain snapshot", {
      field: "expressionDomain",
      details: {
        missingCriteria: criteriaWithMissingSnapshot.map((criterion) =>
          String(criterion?.name || "")
        ),
      },
    });
  }
  const snapshotIds = Array.from(
    new Set(criteria.map((criterion) => toIdString(criterion?.expressionDomain)).filter(Boolean))
  );

  const snapshots = await IssueExpressionDomain.find({
    _id: { $in: snapshotIds },
  }).lean();
  const snapshotById = new Map(
    snapshots
      .map((snapshot) => [toIdString(snapshot?._id), snapshot])
      .filter(([snapshotId]) => Boolean(snapshotId))
  );

  const criteriaWithExpressionDomain = criteria.map((criterion) => {
    const snapshotId = toIdString(criterion?.expressionDomain);
    const snapshot = snapshotById.get(snapshotId);
    const serialized = serializeIssueExpressionDomainSnapshot(snapshot);

    if (!serialized || !serialized.type) {
      throw createBadRequestError(
        `Expression domain snapshot is missing or invalid for criterion '${String(criterion?.name || "")}'`,
        {
          field: "expressionDomain",
        }
      );
    }

    return {
      ...criterion,
      expressionDomain: serialized,
    };
  });

  const criterionDomainByName = new Map(
    criteriaWithExpressionDomain.map((criterion) => [
      String(criterion?.name || ""),
      criterion.expressionDomain,
    ])
  );

  return {
    alternatives,
    criteria: criteriaWithExpressionDomain,
    criterionDomainByName,
    alternativeNames: alternatives.map((alternative) => String(alternative?.name || "")),
    criterionNames: criteriaWithExpressionDomain.map((criterion) =>
      String(criterion?.name || "")
    ),
  };
};

const cloneNumericRange = (numericRange) => ({
  min:
    typeof numericRange?.min === "number" && Number.isFinite(numericRange.min)
      ? numericRange.min
      : null,
  max:
    typeof numericRange?.max === "number" && Number.isFinite(numericRange.max)
      ? numericRange.max
      : null,
  step:
    typeof numericRange?.step === "number" && Number.isFinite(numericRange.step)
      ? numericRange.step
      : null,
});

const cloneLinguisticLabels = (linguisticLabels) =>
  Array.isArray(linguisticLabels)
    ? linguisticLabels
        .map((entry) => ({
          label: typeof entry?.label === "string" ? entry.label : null,
          values: Array.isArray(entry?.values) ? [...entry.values] : [],
        }))
        .filter((entry) => entry.label)
    : [];

export const serializeIssueExpressionDomainSnapshot = (snapshot) => {
  if (!snapshot || typeof snapshot !== "object") {
    return null;
  }

  return {
    id: String(snapshot?._id || ""),
    _id: snapshot?._id || null,
    name: typeof snapshot?.name === "string" ? snapshot.name : null,
    type: typeof snapshot?.type === "string" ? snapshot.type : null,
    numericRange: cloneNumericRange(snapshot?.numericRange),
    linguisticLabels: cloneLinguisticLabels(snapshot?.linguisticLabels),
    membershipFunction:
      typeof snapshot?.membershipFunction === "string"
        ? snapshot.membershipFunction
        : null,
    valueCount:
      typeof snapshot?.valueCount === "number" && Number.isFinite(snapshot.valueCount)
        ? snapshot.valueCount
        : null,
    valuesMode:
      typeof snapshot?.valuesMode === "string" ? snapshot.valuesMode : null,
  };
};
