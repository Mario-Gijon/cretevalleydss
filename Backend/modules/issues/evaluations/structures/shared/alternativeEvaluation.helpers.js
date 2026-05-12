import {
  getOrderedAlternativesDb,
  getOrderedLeafCriteriaDb,
} from "../../../issue.ordering.js";
import { getDefaultIssueSnapshot } from "../../../issue.queries.js";
import { createBadRequestError } from "../../../../../utils/common/errors.js";

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
      select: "_id name type",
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

  return {
    alternatives,
    criteria,
    alternativeNames: alternatives.map((alternative) => String(alternative?.name || "")),
    criterionNames: criteria.map((criterion) => String(criterion?.name || "")),
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

export const getDefaultIssueExpressionDomainSnapshotOrThrow = async ({ issue }) => {
  const snapshot = await getDefaultIssueSnapshot(issue?._id);
  if (!snapshot) {
    throw createBadRequestError("This issue has no expression domain snapshots", {
      field: "expressionDomain",
    });
  }

  const serialized = serializeIssueExpressionDomainSnapshot(snapshot);
  if (!serialized) {
    throw createBadRequestError("Issue expression domain snapshot is invalid", {
      field: "expressionDomain",
    });
  }

  return serialized;
};
