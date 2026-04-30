import { Issue } from "../../../models/Issues.js";

import { validateIssueIdOrThrow } from "../issue.queries.js";
import { getResolutionResolverOrThrow } from "./resolution.registry.js";

import { createNotFoundError } from "../../../utils/common/errors.js";

/**
 * Resuelve un issue delegando según su estructura de evaluación configurada.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string} params.issueId Id del issue.
 * @param {string} params.userId Id del usuario actual.
 * @param {boolean} [params.forceFinalize=false] Fuerza la finalización.
 * @param {string} params.apiModelsBaseUrl Base URL del servicio de modelos.
 * @param {Object} params.httpClient Cliente HTTP.
 * @returns {Promise<Object>}
 */
export const resolveIssue = async ({
  issueId,
  userId,
  forceFinalize = false,
  apiModelsBaseUrl,
  httpClient,
}) => {
  validateIssueIdOrThrow(issueId);

  const issue = await Issue.findById(issueId)
    .select("_id evaluationStructure")
    .lean();

  if (!issue) {
    throw createNotFoundError("Issue not found", {
      field: "issueId",
    });
  }

  const evaluationStructure = issue.evaluationStructure;
  const resolver = getResolutionResolverOrThrow(evaluationStructure);

  return resolver({
    issueId,
    userId,
    forceFinalize,
    apiModelsBaseUrl,
    httpClient,
  });
};
