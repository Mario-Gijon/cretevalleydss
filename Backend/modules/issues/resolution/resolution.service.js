import { getIssueByIdOrThrow } from "../issue.queries.js";
import { getResolutionResolverOrThrow } from "./resolution.registry.js";

const resolveResolutionContextOrThrow = async (issueId) => {
  const issue = await getIssueByIdOrThrow(issueId, {
    lean: false,
  });

  const resolver = getResolutionResolverOrThrow(issue.evaluationStructure);

  return {
    issue,
    resolver,
  };
};

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
  const { issue, resolver } = await resolveResolutionContextOrThrow(issueId);

  return resolver({
    issue,
    userId,
    forceFinalize,
    apiModelsBaseUrl,
    httpClient,
  });
};