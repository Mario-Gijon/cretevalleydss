import { Evaluation } from "../../../../models/Evaluations.js";

import {
  EVALUATION_STRUCTURES,
} from "../../issue.evaluationStructure.js";
import { getEvaluationStructureOperationsOrThrow } from "../../alternativeEvaluations/alternativeEvaluation.registry.js";
import { getNextConsensusPhase } from "../../issue.queries.js";
import { buildModelInputPayload } from "../modelInputs/modelInput.adapters.js";
import { buildPairwiseResolutionResult } from "../resolution.results.js";
import { handlePairwiseResolutionLifecycle } from "../resolution.lifecycle.js";
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

const getBuildResolutionDataOrThrow = (structure) => {
  if (typeof structure?.buildResolutionData !== "function") {
    throw createInternalError(
      `Resolution data builder is not implemented for evaluation structure ${String(structure?.key)}`
    );
  }

  return structure.buildResolutionData;
};

/**
 * Resuelve un issue de evaluación pairwise.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string} params.issueId Id del issue.
 * @param {string} params.userId Id del usuario actual.
 * @param {boolean} [params.forceFinalize=false] Fuerza la finalización.
 * @param {string} params.apiModelsBaseUrl Base URL del servicio de modelos.
 * @param {Object} params.httpClient Cliente HTTP.
 * @returns {Promise<Object>}
 */
export const resolvePairwiseIssue = async ({
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
      expectedStructure: EVALUATION_STRUCTURES.PAIRWISE_ALTERNATIVES,
      invalidStructureMessage:
        "This issue must be resolved with the direct resolver",
    });

  const pairwiseStructure = getEvaluationStructureOperationsOrThrow(
    EVALUATION_STRUCTURES.PAIRWISE_ALTERNATIVES
  );
  const buildResolutionData =
    getBuildResolutionDataOrThrow(pairwiseStructure);

  const modelKey = getModelEndpointKey(model);
  const modelEndpointUrl = buildModelEndpointUrl(apiModelsBaseUrl, model);

  if (!modelKey || !modelEndpointUrl) {
    throw createBadRequestError(
      `No API endpoint defined for model ${model.name}`
    );
  }

  const { matricesUsed: matrices } = await buildResolutionData({
    issueId: issue._id,
    alternatives,
    criteria,
    participations,
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
    resolverMode: "pairwise",
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

  if (modelKey !== "herrera_viedma_crp") {
    throw createInternalError(
      `Pairwise resolver output is not implemented for model ${model.name}`
    );
  }

  const currentPhase = await getNextConsensusPhase(issue._id);

  const {
    rankedWithScores,
    collectiveEvaluations,
    consensusDetails,
    consensusLevel,
  } = buildPairwiseResolutionResult({
    results,
    alternatives,
    criteria,
    matrices,
    participations,
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

  const evaluationDocs = await Evaluation.find({
    issue: issue._id,
    expert: { $in: participations.map((participation) => participation.expert._id) },
    criterion: { $in: criteria.map((criterion) => criterion._id) },
    comparedAlternative: { $ne: null },
  });

  const now = new Date();

  for (const evaluation of evaluationDocs) {
    if (evaluation.consensusPhase !== null) {
      evaluation.history.push({
        phase: evaluation.consensusPhase,
        value: evaluation.value,
        timestamp: evaluation.timestamp,
      });
    }

    evaluation.consensusPhase = currentPhase + 1;
    evaluation.timestamp = now;
  }

  if (evaluationDocs.length > 0) {
    await Promise.all(evaluationDocs.map((evaluation) => evaluation.save()));
  }

  return handlePairwiseResolutionLifecycle({
    issue,
    forceFinalize,
    currentPhase,
    consensusLevel,
    rankedWithScores,
  });
};
