import { getEvaluationStructureOperationsOrThrow } from "../../alternativeEvaluations/alternativeEvaluation.registry.js";
import { getNextConsensusPhase } from "../../issue.queries.js";
import { buildModelInputPayload } from "../modelInputs/modelInput.adapters.js";
import { buildResolutionResult } from "../resolution.results.js";
import {
  handleResolutionLifecycle,
  getLifecyclePolicyOrThrow,
} from "../resolution.lifecycle.js";
import { saveResolutionConsensus } from "../resolution.consensus.js";
import { countNullsDeep } from "../resolution.shared.js";
import { getResolutionContext } from "../resolution.context.js";
import { normalizeParams } from "../../../../services/modelApi/modelParamNormalizer.js";
import {
  buildModelEndpointUrl,
  getModelEndpointKey,
} from "../../../../services/modelApi/modelCatalog.js";
import {
  createModelApiRequestError,
  unwrapModelApiResponse,
} from "../../../../services/modelApi/modelResponse.js";
import {
  createBadRequestError,
  createInternalError,
} from "../../../../utils/common/errors.js";

const getBuildResolutionDataOrThrow = ({
  operations,
  evaluationStructure,
}) => {
  if (typeof operations?.buildResolutionData !== "function") {
    throw createInternalError(
      `Resolution data builder is not implemented for evaluation structure ${String(evaluationStructure)}`
    );
  }

  return operations.buildResolutionData;
};

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

  const evaluationOperations = getEvaluationStructureOperationsOrThrow(
    issue.evaluationStructure
  );
  const buildResolutionData = getBuildResolutionDataOrThrow({
    operations: evaluationOperations,
    evaluationStructure: issue.evaluationStructure,
  });

  const currentPhase = await getNextConsensusPhase(issue._id);

  const modelKey = getModelEndpointKey(model);
  const modelEndpointUrl = buildModelEndpointUrl(apiModelsBaseUrl, model);

  if (!modelKey || !modelEndpointUrl) {
    throw createBadRequestError(
      `No API endpoint defined for model ${model.name}`
    );
  }

  const { matricesUsed: matrices } = await buildResolutionData({
    issueId,
    alternatives,
    criteria,
    participations,
    currentPhase,
  });

  const nullCount = countNullsDeep(matrices);
  if (nullCount > 0) {
    throw createBadRequestError(
      "Not all experts have completed their pairwise evaluations"
    );
  }

  const normalizedModelParams = normalizeParams(issue.modelParameters);
  const modelInputPayload = buildModelInputPayload({
    inputKind: model?.inputKind,
    matrices,
    modelParameters: normalizedModelParams,
    criterionTypes: null,
    consensusThreshold: issue.consensusThreshold,
  });

  let response;
  try {
    response = await httpClient.post(
      modelEndpointUrl,
      modelInputPayload,
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    throw createModelApiRequestError(error);
  }

  const results = unwrapModelApiResponse(response);

  const {
    rankedWithScores,
    collectiveEvaluations,
    consensusDetails,
    consensusLevel,
  } = buildResolutionResult({
    results,
    alternatives,
    criteria,
    matrices,
    participations,
    issue,
    model,
    modelKey,
    modelParameters: normalizedModelParams,
    rawOutput: results,
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
