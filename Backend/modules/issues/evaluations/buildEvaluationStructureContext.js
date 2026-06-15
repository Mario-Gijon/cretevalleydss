import { Criterion } from "../../../models/Criteria.js";
import { IssueExpressionDomain } from "../../../models/IssueExpressionDomains.js";
import { createBadRequestError } from "../../../utils/common/errors.js";
import { toIdString } from "../../../utils/common/ids.js";
import { getOrderedAlternativesDb } from "../shared/ordering.js";
import {
  getOrderedAlternativeAndCriterionNames,
  serializeIssueExpressionDomainSnapshot,
} from "./evaluationStructureData.js";

const hasUsableSerializedExpressionDomain = (expressionDomain) =>
  Boolean(
    expressionDomain &&
      typeof expressionDomain === "object" &&
      !Array.isArray(expressionDomain) &&
      typeof expressionDomain.type === "string" &&
      expressionDomain.type.trim()
  );

const isObjectCriterion = (criterion) =>
  Boolean(
    criterion &&
      typeof criterion === "object" &&
      !Array.isArray(criterion)
  );

const normalizeProvidedLeafCriteriaOrThrow = async ({ leafCriteria }) => {
  if (!Array.isArray(leafCriteria)) {
    return leafCriteria;
  }

  const objectCriteria = leafCriteria.filter(isObjectCriterion);

  if (objectCriteria.length === 0) {
    return leafCriteria;
  }

  const criteriaNeedingCriterionLookup = objectCriteria.filter(
    (criterion) =>
      !hasUsableSerializedExpressionDomain(criterion.expressionDomain) &&
      !toIdString(criterion.expressionDomain)
  );

  const criteriaMissingResolutionSource = criteriaNeedingCriterionLookup.filter(
    (criterion) => !toIdString(criterion?._id)
  );

  if (criteriaMissingResolutionSource.length > 0) {
    throw createBadRequestError("Each leaf criterion must have an expression domain snapshot", {
      field: "expressionDomain",
      details: {
        missingCriteria: criteriaMissingResolutionSource.map((criterion) =>
          String(criterion?.name || "")
        ),
      },
    });
  }

  const criterionIds = Array.from(
    new Set(
      criteriaNeedingCriterionLookup
        .map((criterion) => toIdString(criterion?._id))
        .filter(Boolean)
    )
  );

  const criteriaFromDb =
    criterionIds.length > 0
      ? await Criterion.find({
          _id: { $in: criterionIds },
        })
          .select("_id expressionDomain")
          .lean()
      : [];

  const criterionById = new Map(
    criteriaFromDb
      .map((criterion) => [toIdString(criterion?._id), criterion])
      .filter(([criterionId]) => Boolean(criterionId))
  );

  const missingCriterionIds = criterionIds.filter(
    (criterionId) => !criterionById.has(criterionId)
  );

  if (missingCriterionIds.length > 0) {
    throw createBadRequestError(
      "Leaf criteria are missing required criterion records to resolve expression domains",
      {
        field: "leafCriteria",
        details: {
          missingCriterionIds,
        },
      }
    );
  }

  const snapshotIds = Array.from(
    new Set(
      objectCriteria
        .map((criterion) => {
          if (hasUsableSerializedExpressionDomain(criterion.expressionDomain)) {
            return null;
          }

          const directSnapshotId = toIdString(criterion?.expressionDomain);
          if (directSnapshotId) {
            return directSnapshotId;
          }

          const criterionId = toIdString(criterion?._id);
          const dbCriterion = criterionById.get(criterionId);

          if (hasUsableSerializedExpressionDomain(dbCriterion?.expressionDomain)) {
            return null;
          }

          return toIdString(dbCriterion?.expressionDomain);
        })
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
    if (!isObjectCriterion(criterion)) {
      return criterion;
    }

    if (hasUsableSerializedExpressionDomain(criterion.expressionDomain)) {
      return criterion;
    }

    const criterionId = toIdString(criterion?._id);
    const dbCriterion = criterionById.get(criterionId);
    const fallbackExpressionDomain = dbCriterion?.expressionDomain;

    if (hasUsableSerializedExpressionDomain(fallbackExpressionDomain)) {
      return {
        ...criterion,
        expressionDomain: fallbackExpressionDomain,
      };
    }

    const snapshotId =
      toIdString(criterion.expressionDomain) ||
      toIdString(fallbackExpressionDomain);
    const snapshot = snapshotById.get(snapshotId);
    const serialized = serializeIssueExpressionDomainSnapshot(snapshot);

    if (!serialized || !serialized.type) {
      throw createBadRequestError(
        `Expression domain snapshot is missing or invalid for criterion '${String(criterion?.name || "")}'`,
        {
          field: "expressionDomain",
          details: {
            criterionId: criterionId || null,
            expressionDomainId: snapshotId || null,
          },
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
