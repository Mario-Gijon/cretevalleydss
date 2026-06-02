import { IssueExpressionDomain } from "../../../models/IssueExpressionDomains.js";
import { createBadRequestError } from "../../../utils/common/errors.js";
import { toIdString } from "../../../utils/common/ids.js";
import { getOrderedAlternativesDb } from "../../issues/shared/ordering.js";
import {
  getOrderedAlternativeAndCriterionNames,
  serializeIssueExpressionDomainSnapshot,
} from "./structures/shared/alternativeEvaluation.helpers.js";

const hasUsableSerializedExpressionDomain = (expressionDomain) =>
  Boolean(
    expressionDomain &&
      typeof expressionDomain === "object" &&
      !Array.isArray(expressionDomain) &&
      typeof expressionDomain.type === "string" &&
      expressionDomain.type.trim()
  );

const shouldNormalizeProvidedLeafCriteriaDomains = (leafCriteria) =>
  leafCriteria.some(
    (criterion) =>
      criterion &&
      typeof criterion === "object" &&
      !Array.isArray(criterion) &&
      Object.prototype.hasOwnProperty.call(criterion, "expressionDomain")
  );

const normalizeProvidedLeafCriteriaOrThrow = async ({ leafCriteria }) => {
  if (!Array.isArray(leafCriteria)) {
    return leafCriteria;
  }

  if (!shouldNormalizeProvidedLeafCriteriaDomains(leafCriteria)) {
    return leafCriteria;
  }

  const criteriaWithMissingSnapshot = leafCriteria.filter((criterion) => {
    if (!criterion || typeof criterion !== "object" || Array.isArray(criterion)) {
      return false;
    }

    return (
      !hasUsableSerializedExpressionDomain(criterion.expressionDomain) &&
      !toIdString(criterion.expressionDomain)
    );
  });

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
    new Set(
      leafCriteria
        .filter(
          (criterion) =>
            criterion &&
            typeof criterion === "object" &&
            !Array.isArray(criterion) &&
            !hasUsableSerializedExpressionDomain(criterion.expressionDomain)
        )
        .map((criterion) => toIdString(criterion?.expressionDomain))
        .filter(Boolean)
    )
  );

  const snapshots =
    snapshotIds.length > 0
      ? await IssueExpressionDomain.find({
          _id: { $in: snapshotIds },
        })
          .select(
            "_id name type numericRange linguisticLabels membershipFunction valueCount valuesMode"
          )
          .lean()
      : [];

  const snapshotById = new Map(
    snapshots
      .map((snapshot) => [toIdString(snapshot?._id), snapshot])
      .filter(([snapshotId]) => Boolean(snapshotId))
  );

  return leafCriteria.map((criterion) => {
    if (!criterion || typeof criterion !== "object" || Array.isArray(criterion)) {
      return criterion;
    }

    if (hasUsableSerializedExpressionDomain(criterion.expressionDomain)) {
      return criterion;
    }

    const snapshotId = toIdString(criterion.expressionDomain);
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
};

export const buildEvaluationStructureContext = async ({
  issue,
  alternatives = null,
  leafCriteria = null,
  criteria = null,
  collectiveEvaluations = null,
}) => {
  const providedLeafCriteria = Array.isArray(leafCriteria)
    ? leafCriteria
    : Array.isArray(criteria)
      ? criteria
      : null;
  const resolvedLeafCriteria = await normalizeProvidedLeafCriteriaOrThrow({
    leafCriteria: providedLeafCriteria,
  });

  if (Array.isArray(alternatives) && Array.isArray(resolvedLeafCriteria)) {
    return {
      issue,
      alternatives,
      leafCriteria: resolvedLeafCriteria,
      collectiveEvaluations,
    };
  }

  if (!Array.isArray(alternatives) && Array.isArray(resolvedLeafCriteria)) {
    const issueId = issue?._id || issue?.id;

    return {
      issue,
      alternatives: await getOrderedAlternativesDb({
        issueId,
        issueDoc: issue?._id ? issue : null,
        select: "_id name",
        lean: true,
      }),
      leafCriteria: resolvedLeafCriteria,
      collectiveEvaluations,
    };
  }

  const resolved = await getOrderedAlternativeAndCriterionNames({ issue });

  return {
    issue,
    alternatives: Array.isArray(alternatives) ? alternatives : resolved.alternatives,
    leafCriteria: Array.isArray(resolvedLeafCriteria)
      ? resolvedLeafCriteria
      : resolved.criteria,
    collectiveEvaluations,
  };
};
