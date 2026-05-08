import { getNextConsensusPhase } from "../../issue.queries.js";
import {
  handleResolutionLifecycle,
  getLifecyclePolicyOrThrow,
} from "../resolution.lifecycle.js";
import { saveResolutionConsensus } from "../resolution.consensus.js";
import { executeResolutionModelPipeline } from "../resolution.execution.js";
import { getResolutionContext } from "../resolution.context.js";

/**
 * Resuelve un issue de evaluación pairwise.
 *
 * @param {object} params Parámetros de entrada.
 * @param {Object} params.issue Issue cargado.
 * @param {string} params.userId Id del usuario actual.
 * @param {boolean} [params.forceFinalize=false] Fuerza la finalización.
 * @param {string} params.apiModelsBaseUrl Base URL del servicio de modelos.
 * @param {Object} params.httpClient Cliente HTTP.
 * @returns {Promise<Object>}
 */
export const resolvePairwiseIssue = async ({
  issue,
  userId,
  forceFinalize = false,
  apiModelsBaseUrl,
  httpClient,
}) => {
  const { issueId, model, participations, alternatives, criteria } =
    await getResolutionContext({
      issue,
      userId,
    });

  const currentPhase = await getNextConsensusPhase(issue._id);

  const {
    rankedWithScores,
    collectiveEvaluations,
    consensusDetails,
    consensusLevel,
  } = await executeResolutionModelPipeline({
    issue,
    issueId,
    model,
    evaluationStructure: issue.evaluationStructure,
    alternatives,
    criteria,
    participations,
    currentPhase,
    modelParameters: issue.modelParameters,
    apiModelsBaseUrl,
    httpClient,
    requireCompleteMatrices: true,
    incompleteMatricesMessage:
      "Not all experts have completed their pairwise evaluations",
  });

  await saveResolutionConsensus({
    issue,
    currentPhase,
    consensusLevel,
    consensusDetails,
    collectiveEvaluations,
    rankedWithScores,
  });

  const lifecyclePolicy = getLifecyclePolicyOrThrow(issue?.lifecycleKind);

  return handleResolutionLifecycle({
    issue,
    forceFinalize,
    currentPhase,
    consensusLevel,
    rankedAlternatives: rankedWithScores,
    lifecyclePolicy,
  });
};
