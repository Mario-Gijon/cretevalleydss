import {
  EVALUATION_STRUCTURES,
} from "../../issue.evaluationStructure.js";
import { getEvaluationStructureOperationsOrThrow } from "../../alternativeEvaluations/alternativeEvaluation.registry.js";
import { getNextConsensusPhase } from "../../issue.queries.js";
import { buildModelInputPayload } from "../modelInputs/modelInput.adapters.js";
import { buildDirectResolutionResult } from "../resolution.results.js";
import { handleDirectResolutionLifecycle } from "../resolution.lifecycle.js";
import { saveResolutionConsensus } from "../resolution.consensus.js";
import { buildCriterionTypes } from "../resolution.shared.js";
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

const getBuildResolutionDataOrThrow = (structure) => {
  if (typeof structure?.buildResolutionData !== "function") {
    throw createInternalError(
      `Resolution data builder is not implemented for evaluation structure ${String(structure?.key)}`
    );
  }

  return structure.buildResolutionData;
};

/**
 * Resuelve un issue de evaluación directa.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string} params.issueId Id del issue.
 * @param {string} params.userId Id del usuario actual.
 * @param {boolean} [params.forceFinalize=false] Fuerza la finalización.
 * @param {string} params.apiModelsBaseUrl Base URL del servicio de modelos.
 * @param {Object} params.httpClient Cliente HTTP.
 * @returns {Promise<Object>}
 */
export const resolveDirectIssue = async ({
  issueId,
  userId,
  forceFinalize = false,
  apiModelsBaseUrl,
  httpClient,
}) => {
  const { issue, model, participations, alternatives, criteria } =
    await getResolutionContext({
      issueId,
      userId,
      expectedStructure: EVALUATION_STRUCTURES.DIRECT,
      invalidStructureMessage:
        "This issue must be resolved with the pairwise resolver",
    });

  const directStructure = getEvaluationStructureOperationsOrThrow(
    EVALUATION_STRUCTURES.DIRECT
  );
  const buildResolutionData =
    getBuildResolutionDataOrThrow(directStructure);

  const { matricesUsed: matrices } = await buildResolutionData({
    issueId: issue._id,
    alternatives,
    criteria,
    participations,
  });

  const modelKey = getModelEndpointKey(model);
  const modelEndpointUrl = buildModelEndpointUrl(apiModelsBaseUrl, model);

  if (!modelKey || !modelEndpointUrl) {
    throw createBadRequestError(
      `No API endpoint defined for model ${model.name}`
    );
  }

  const criterionTypes = buildCriterionTypes(criteria);
  const normalizedModelParams = normalizeParams(issue.modelParameters);
  const modelInputPayload = buildModelInputPayload({
    inputKind: model?.inputKind,
    resolverMode: "direct",
    matrices,
    modelParameters: normalizedModelParams,
    criterionTypes,
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

  const currentPhase = await getNextConsensusPhase(issue._id);

  const {
    rankedAlternatives,
    rankedWithScores,
    collectiveEvaluations,
    consensusDetails,
    consensusLevel,
  } = buildDirectResolutionResult({
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
  });

  return handleDirectResolutionLifecycle({
    issue,
    forceFinalize,
    currentPhase,
    rankedAlternatives,
    rawResults: results,
  });
};
