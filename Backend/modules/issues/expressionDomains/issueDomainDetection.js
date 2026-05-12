import { IssueExpressionDomain } from "../../../models/IssueExpressionDomains.js";

import { createBadRequestError } from "../../../utils/common/errors.js";

const normalizeDomainType = (value) => {
  const normalized = String(value || "").trim();

  return normalized.length > 0 ? normalized : null;
};

/**
 * Detecta el tipo de dominio de expresión usado por un issue desde sus snapshots.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string|Object} params.issueId Id del issue.
 * @returns {Promise<{domainType: string|null, domainTypes: string[]}>}
 */
export const detectIssueDomainTypeOrThrow = async ({ issueId }) => {
  const snapshots = await IssueExpressionDomain.find({ issue: issueId })
    .select("type")
    .lean();

  const domainTypes = [
    ...new Set(
      snapshots
        .map((snapshot) => normalizeDomainType(snapshot.type))
        .filter(Boolean)
    ),
  ];

  if (domainTypes.length === 0) {
    return {
      domainType: null,
      domainTypes: [],
    };
  }

  if (domainTypes.length > 1) {
    throw createBadRequestError(
      "Mixed expression domain types are not supported for this operation",
      {
        field: "expressionDomain",
        details: {
          domainTypes,
        },
      }
    );
  }

  return {
    domainType: domainTypes[0],
    domainTypes,
  };
};