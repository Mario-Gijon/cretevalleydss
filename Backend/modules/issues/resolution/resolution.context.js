import { Participation } from "../../../models/Participations.js";

import {
  ensureIssueOrdersDb,
  getOrderedAlternativesDb,
  getOrderedLeafCriteriaDb,
} from "../issue.ordering.js";
import {
  createBadRequestError,
  createForbiddenError,
} from "../../../utils/common/errors.js";
import { sameId } from "../../../utils/common/ids.js";

/**
 * Carga y valida el contexto común necesario para resolver un issue.
 *
 * @param {object} params Parámetros de entrada.
 * @param {Object} params.issue Issue cargado.
 * @param {string} params.userId Id del usuario actual.
 * @returns {Promise<Object>}
 */
export const getResolutionContext = async ({
  issue,
  userId,
}) => {
  const issueDoc = issue;
  const issueId = issueDoc?._id;

  if (!issueId) {
    throw createBadRequestError("Valid issue id is required", {
      field: "issueId",
    });
  }

  const snapshotErrors = [];
  const apiModelKey = String(issueDoc?.apiModelKey || "").trim();
  const endpointPath = String(issueDoc?.apiEndpoint?.path || "").trim();
  const inputKind = String(issueDoc?.inputKind || "").trim();
  const outputKind = String(issueDoc?.outputKind || "").trim();
  const evaluationStructure = String(issueDoc?.evaluationStructure || "").trim();
  const lifecycleKind = String(issueDoc?.lifecycleKind || "").trim();

  if (!apiModelKey) snapshotErrors.push("apiModelKey");
  if (!endpointPath) snapshotErrors.push("apiEndpoint.path");
  if (!inputKind) snapshotErrors.push("inputKind");
  if (!outputKind) snapshotErrors.push("outputKind");
  if (!evaluationStructure) snapshotErrors.push("evaluationStructure");
  if (!lifecycleKind) snapshotErrors.push("lifecycleKind");

  if (snapshotErrors.length > 0) {
    throw createBadRequestError(
      "Issue is missing required runtime model snapshot metadata",
      {
        field: "issue",
        details: {
          missingFields: snapshotErrors,
        },
      }
    );
  }

  const model = {
    _id: issueDoc.model ?? null,
    name: issueDoc?.apiModelKey ?? "unknown",
    apiModelKey,
    apiEndpoint: {
      method: issueDoc?.apiEndpoint?.method ?? null,
      path: endpointPath,
      operationId: issueDoc?.apiEndpoint?.operationId ?? null,
    },
    inputKind,
    outputKind,
  };

  if (!sameId(issueDoc.admin, userId)) {
    throw createForbiddenError(
      "Unauthorized: Only the issue creator can resolve it"
    );
  }

  const participations = await Participation.find({
    issue: issueId,
    invitationStatus: "accepted",
  })
    .populate("expert", "email")
    .lean();

  const pendingParticipations = participations.filter(
    (participation) => !participation.evaluationCompleted
  );

  if (pendingParticipations.length > 0) {
    throw createBadRequestError(
      "Not all experts have completed their evaluations"
    );
  }

  await ensureIssueOrdersDb({ issueId });

  const [alternatives, criteria] = await Promise.all([
    getOrderedAlternativesDb({
      issueId,
      issueDoc,
      select: "_id name",
      lean: true,
    }),
    getOrderedLeafCriteriaDb({
      issueId,
      issueDoc,
      select: "_id name type",
      lean: true,
    }),
  ]);

  if (!alternatives.length || !criteria.length) {
    throw createBadRequestError("Issue has no alternatives/leaf criteria");
  }

  return {
    issue: issueDoc,
    issueId,
    model,
    participations,
    alternatives,
    criteria,
  };
};
