import {
  getOrderedAlternativesDb,
  getOrderedLeafCriteriaDb,
} from "../shared/ordering.js";
import { IssueExpressionDomain } from "../../../models/IssueExpressionDomains.js";
import { createBadRequestError } from "../../../utils/common/errors.js";
import { toIdString } from "../../../utils/common/ids.js";

export const getOrderedAlternativeAndCriterionNames = async ({ issue }) => {
  const [alternatives, criteria] = await Promise.all([
    getOrderedAlternativesDb({
      issueId: issue?._id,
      issueDoc: issue,
      select: "_id name description",
      lean: true,
    }),
    getOrderedLeafCriteriaDb({
      issueId: issue?._id,
      issueDoc: issue,
      select: "_id name description type expressionDomain",
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

  const normalizedAlternatives = alternatives.map((alternative) => ({
    ...alternative,
    id: toIdString(alternative?._id || alternative?.id) || null,
    name: typeof alternative?.name === "string" ? alternative.name : "",
    description: alternative?.description || null,
  }));

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

    if (!serialized || !serialized.typeKey) {
      throw createBadRequestError(
        `Expression domain snapshot is missing or invalid for criterion '${String(criterion?.name || "")}'`,
        {
          field: "expressionDomain",
        }
      );
    }

    return {
      ...criterion,
      id: toIdString(criterion?._id || criterion?.id) || null,
      name: typeof criterion?.name === "string" ? criterion.name : "",
      description: criterion?.description || null,
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
    alternatives: normalizedAlternatives,
    criteria: criteriaWithExpressionDomain,
    criterionDomainByName,
    alternativeNames: normalizedAlternatives.map((alternative) =>
      String(alternative?.name || "")
    ),
    criterionNames: criteriaWithExpressionDomain.map((criterion) =>
      String(criterion?.name || "")
    ),
  };
};

const cloneSerializable = (value, fallback) => {
  if (value === undefined) {
    return fallback;
  }

  if (value === null) {
    return null;
  }

  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return fallback;
  }
};

export const serializeIssueExpressionDomainSnapshot = (snapshot) => {
  if (!snapshot || typeof snapshot !== "object") {
    return null;
  }

  return {
    id: String(snapshot?._id || ""),
    _id: snapshot?._id || null,
    name: typeof snapshot?.name === "string" ? snapshot.name : null,
    typeKey:
      typeof snapshot?.typeKey === "string" ? snapshot.typeKey : null,
    definition: cloneSerializable(snapshot?.definition, {}),
  };
};
