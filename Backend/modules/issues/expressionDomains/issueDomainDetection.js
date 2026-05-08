import { Evaluation } from "../../../models/Evaluations.js";
import { IssueExpressionDomain } from "../../../models/IssueExpressionDomains.js";
import { createBadRequestError } from "../../../utils/common/errors.js";

/**
 * Detecta el tipo de dominio usado en un issue a partir de los snapshots utilizados.
 *
 * @param {object} params Datos de entrada.
 * @param {string|Object} params.issueId Id del issue.
 * @param {Array<string|Object>} params.expertIds Ids de expertos.
 * @returns {Promise<Object>}
 */
export const detectIssueDomainTypeOrThrow = async ({ issueId, expertIds }) => {
  const snapshotIds = await Evaluation.distinct("expressionDomain", {
    issue: issueId,
    expert: { $in: expertIds },
  });

  const snapshots = await IssueExpressionDomain.find(
    { _id: { $in: snapshotIds }, issue: issueId },
    "type"
  ).lean();

  const types = new Set(
    snapshots.map((snapshot) => snapshot.type).filter(Boolean)
  );

  if (types.size === 0) {
    throw createBadRequestError(
      "Cannot detect issue domain type (no snapshots found in evaluations)."
    );
  }

  if (types.size > 1) {
    throw createBadRequestError(
      "This issue mixes numeric and linguistic domains. Simulation is disabled for now."
    );
  }

  return {
    domainType: Array.from(types)[0],
    snapshotIdsUsed: snapshotIds,
  };
};
