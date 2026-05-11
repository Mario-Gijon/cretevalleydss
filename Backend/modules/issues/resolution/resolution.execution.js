import { getEvaluationStructureOperationsOrThrow } from "../alternativeEvaluations/alternativeEvaluation.registry.js";
import { buildModelInputPayload } from "./modelInputs/modelInput.adapters.js";
import { buildResolutionResult } from "./resolution.results.js";
import { buildCriterionTypes, countNullsDeep } from "./resolution.shared.js";
import {
  buildModelEndpointUrl,
  getModelEndpointKey,
} from "../../../services/modelApi/modelCatalog.js";
import {
  createModelApiRequestError,
  unwrapModelApiResponse,
} from "../../../services/modelApi/modelResponse.js";
import {
  createBadRequestError,
  createInternalError,
} from "../../../utils/common/errors.js";

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

const isDirectApiInputFormat = (apiInputFormat) =>
  apiInputFormat === "directCrispMatrix" || apiInputFormat === "directFuzzyMatrix";

export const executeResolutionModelPipeline = async ({
  issue,
  issueId,
  model,
  evaluationStructure,
  alternatives,
  criteria,
  participations,
  currentPhase,
  modelParameters,
  apiModelsBaseUrl,
  httpClient,
  requireCompleteMatrices = false,
  incompleteMatricesMessage = "Not all required evaluations are completed",
  requestErrorMessage = null,
}) => {
  const evaluationOperations =
    getEvaluationStructureOperationsOrThrow(evaluationStructure);
  const buildResolutionData = getBuildResolutionDataOrThrow({
    operations: evaluationOperations,
    evaluationStructure,
  });

  const { matricesUsed, snapshotIdsUsed = [] } = await buildResolutionData({
    issueId,
    alternatives,
    criteria,
    participations,
    currentPhase,
    apiInputFormat: model?.apiInputFormat,
  });

  if (requireCompleteMatrices) {
    const nullCount = countNullsDeep(matricesUsed);
    if (nullCount > 0) {
      throw createBadRequestError(incompleteMatricesMessage);
    }
  }

  const modelKey = getModelEndpointKey(model);
  const modelEndpointUrl = buildModelEndpointUrl(apiModelsBaseUrl, model);

  if (!modelKey || !modelEndpointUrl) {
    throw createBadRequestError(
      `No API endpoint defined for model ${model.name}`
    );
  }

  const criterionTypes = isDirectApiInputFormat(model?.apiInputFormat)
    ? buildCriterionTypes(criteria)
    : null;
  const modelInputPayload = buildModelInputPayload({
    apiInputFormat: model?.apiInputFormat,
    matrices: matricesUsed,
    modelParameters,
    criterionTypes,
    consensusThreshold: issue?.consensusThreshold,
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
    if (requestErrorMessage) {
      throw createModelApiRequestError(error, requestErrorMessage);
    }
    throw createModelApiRequestError(error);
  }

  const results = unwrapModelApiResponse(response);
  const resolutionResult = buildResolutionResult({
    results,
    alternatives,
    criteria,
    matrices: matricesUsed,
    participations,
    issue,
    model,
    modelKey,
    modelParameters,
    rawOutput: results,
  });

  return {
    matricesUsed,
    snapshotIdsUsed,
    results,
    modelKey,
    normalizedModelParams: modelParameters,
    ...resolutionResult,
  };
};
