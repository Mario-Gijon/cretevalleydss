                                     

         
import { Consensus } from "../../models/Consensus.js";
import { Evaluation } from "../../models/Evaluations.js";
import { Issue } from "../../models/Issues.js";
import { IssueModel } from "../../models/IssueModels.js";
import { Participation } from "../../models/Participations.js";

          
import {
  EVALUATION_STRUCTURES,
  resolveEvaluationStructure,
} from "./issue.evaluationStructure.js";
import { validateIssueIdOrThrow } from "./alternativeEvaluations/alternativeEvaluation.shared.js";
import { getNextConsensusPhase } from "./issue.queries.js";
import {
  buildScenarioDirectMatrices,
  buildScenarioPairwiseMatrices,
} from "./issue.scenarios.js";
import { buildModelInputPayload } from "./modelInputs/modelInput.adapters.js";
import { normalizeModelOutput } from "./modelOutputs/modelOutput.adapters.js";

        
import {
  ensureIssueOrdersDb,
  getOrderedAlternativesDb,
  getOrderedLeafCriteriaDb,
} from "../../modules/issues/issue.ordering.js";
import { normalizeParams } from "../../services/modelApi/modelParamNormalizer.js";
import {
  buildModelEndpointUrl,
  getModelEndpointKey,
} from "../../services/modelApi/modelCatalog.js";
import {
  createModelApiRequestError,
  unwrapModelApiResponse,
} from "../../services/modelApi/modelResponse.js";
import {
  createBadRequestError,
  createForbiddenError,
  createInternalError,
  createNotFoundError,
} from "../../utils/common/errors.js";
import { sameId } from "../../utils/common/ids.js";

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
export const resolveIssueFlow = async ({
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

  const evaluationStructure = resolveEvaluationStructure(issue);

  const resolutionFlowByEvaluationStructure = {
    [EVALUATION_STRUCTURES.DIRECT]: resolveDirectIssueFlow,
    [EVALUATION_STRUCTURES.PAIRWISE_ALTERNATIVES]: resolvePairwiseIssueFlow,
  };

  const resolutionFlow =
    resolutionFlowByEvaluationStructure[evaluationStructure];

  if (!resolutionFlow) {
    throw createBadRequestError(
      `Unsupported evaluation structure: ${String(evaluationStructure)}`,
      {
        code: "UNSUPPORTED_EVALUATION_STRUCTURE",
        field: "evaluationStructure",
      }
    );
  }

  return resolutionFlow({
    issueId,
    userId,
    forceFinalize,
    apiModelsBaseUrl,
    httpClient,
  });
};

/**
 * Construye el array de tipos de criterio compatible con los modelos directos.
 *
 * @param {Array<Object>} criteria Criterios hoja ordenados.
 * @returns {string[]}
 */
const buildCriterionTypes = (criteria) =>
  criteria.map((criterion) => (criterion.type === "benefit" ? "max" : "min"));

/**
 * Cuenta valores null dentro de una estructura arbitraria de matrices.
 *
 * @param {unknown} value Estructura a inspeccionar.
 * @returns {number}
 */
const countNullsDeep = (value) => {
  if (value == null) {
    return 1;
  }

  if (Array.isArray(value)) {
    return value.reduce((acc, item) => acc + countNullsDeep(item), 0);
  }

  if (typeof value === "object") {
    return Object.values(value).reduce((acc, item) => acc + countNullsDeep(item), 0);
  }

  return 0;
};

/**
 * Construye metadatos de ejecución del modelo para persistencia de salida cruda.
 *
 * @param {object} params Parámetros de entrada.
 * @param {Object} params.model Modelo del issue.
 * @param {string|null} params.modelKey Clave del endpoint resuelto.
 * @param {Object} params.modelParameters Parámetros efectivos enviados al modelo.
 * @param {Object} params.rawOutput Payload crudo devuelto por ApiModels (ya desempaquetado).
 * @returns {Object}
 */
const buildModelExecutionDetails = ({
  model,
  modelKey,
  modelParameters,
  rawOutput,
}) => {
  return {
    modelKey: modelKey ?? null,
    modelName: model?.name ?? null,
    inputKind: model?.inputKind ?? null,
    outputKind: model?.outputKind ?? null,
    apiEndpoint: model?.apiEndpoint?.path ?? null,
    modelParameters: modelParameters ?? null,
    executedAt: new Date(),
    rawOutput,
  };
};

/**
 * Carga y valida el contexto común necesario para resolver un issue.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string} params.issueId Id del issue.
 * @param {string} params.userId Id del usuario actual.
 * @param {string} params.expectedStructure Estructura de evaluación esperada.
 * @param {string} params.invalidStructureMessage Mensaje de error si la estructura no coincide.
 * @returns {Promise<Object>}
 */
const getResolutionContext = async ({
  issueId,
  userId,
  expectedStructure,
  invalidStructureMessage,
}) => {
  const issue = await Issue.findById(issueId);

  if (!issue) {
    throw createNotFoundError("Issue not found", {
      field: "issueId",
    });
  }

  const evaluationStructure = resolveEvaluationStructure(issue);
  if (evaluationStructure !== expectedStructure) {
    throw createBadRequestError(invalidStructureMessage);
  }

  const model = await IssueModel.findById(issue.model).lean();
  if (!model) {
    throw createNotFoundError("Issue model not found");
  }

  if (!sameId(issue.admin, userId)) {
    throw createForbiddenError(
      "Unauthorized: Only the issue creator can resolve it"
    );
  }

  const participations = await Participation.find({
    issue: issue._id,
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

  await ensureIssueOrdersDb({ issueId: issue._id });

  const [alternatives, criteria] = await Promise.all([
    getOrderedAlternativesDb({
      issueId: issue._id,
      issueDoc: issue,
      select: "_id name",
      lean: true,
    }),
    getOrderedLeafCriteriaDb({
      issueId: issue._id,
      issueDoc: issue,
      select: "_id name type",
      lean: true,
    }),
  ]);

  if (!alternatives.length || !criteria.length) {
    throw createBadRequestError("Issue has no alternatives/leaf criteria");
  }

  return {
    issue,
    model,
    participations,
    alternatives,
    criteria,
  };
};

/**
 * Construye la información persistible y de respuesta para una resolución directa.
 *
 * @param {object} params Parámetros de entrada.
 * @param {Object} params.results Resultado devuelto por el modelo.
 * @param {Array<Object>} params.alternatives Alternativas ordenadas.
 * @param {Array<Object>} params.criteria Criterios hoja ordenados.
 * @param {Object} params.matrices Matrices por experto.
 * @param {Array<Object>} params.participations Participaciones aceptadas.
 * @param {Object} params.issue Issue actual.
 * @param {Object} params.model Modelo del issue.
 * @param {string|null} params.modelKey Clave del endpoint resuelto.
 * @param {Object} params.modelParameters Parámetros efectivos enviados al modelo.
 * @param {Object} params.rawOutput Payload crudo devuelto por ApiModels.
 * @returns {Object}
 */
const buildDirectResolutionArtifacts = ({
  results,
  alternatives,
  criteria,
  matrices,
  participations,
  issue,
  model,
  modelKey,
  modelParameters,
  rawOutput,
}) => {
  const normalizedOutput = normalizeModelOutput({
    outputKind: model?.outputKind,
    rawOutput: results,
    alternatives,
    criteria,
    participations,
    issue,
    model,
    resolutionMode: "direct",
  });

  const modelExecution = buildModelExecutionDetails({
    model,
    modelKey,
    modelParameters,
    rawOutput,
  });

  return {
    rankedAlternatives: normalizedOutput.rankedAlternatives,
    rankedWithScores: normalizedOutput.rankedWithScores,
    collectiveEvaluations: normalizedOutput.collectiveEvaluations,
    consensusDetails: {
      rankedAlternatives: normalizedOutput.rankedWithScores,
      matrices,
      collective_scores: normalizedOutput.collectiveScoresByName,
      collective_ranking: normalizedOutput.collectiveRanking,
      ...(normalizedOutput.plotsGraphic
        ? { plotsGraphic: normalizedOutput.plotsGraphic }
        : {}),
      modelExecution,
    },
    consensusLevel: normalizedOutput.consensusLevel,
  };
};

/**
 * Construye la información persistible y de respuesta para una resolución pairwise.
 *
 * @param {object} params Parámetros de entrada.
 * @param {Object} params.results Resultado devuelto por el modelo.
 * @param {Array<Object>} params.alternatives Alternativas ordenadas.
 * @param {Array<Object>} params.criteria Criterios hoja ordenados.
 * @param {Object} params.matrices Matrices por experto y criterio.
 * @param {Array<Object>} params.participations Participaciones aceptadas.
 * @param {Object} params.model Modelo del issue.
 * @param {string|null} params.modelKey Clave del endpoint resuelto.
 * @param {Object} params.modelParameters Parámetros efectivos enviados al modelo.
 * @param {Object} params.rawOutput Payload crudo devuelto por ApiModels.
 * @returns {Object}
 */
const buildPairwiseResolutionArtifacts = ({
  results,
  alternatives,
  criteria,
  matrices,
  participations,
  model,
  modelKey,
  modelParameters,
  rawOutput,
}) => {
  const normalizedOutput = normalizeModelOutput({
    outputKind: model?.outputKind,
    rawOutput: results,
    alternatives,
    criteria,
    participations,
    issue: null,
    model,
    resolutionMode: "pairwise",
  });

  const modelExecution = buildModelExecutionDetails({
    model,
    modelKey,
    modelParameters,
    rawOutput,
  });

  return {
    rankedWithScores: normalizedOutput.rankedWithScores,
    collectiveEvaluations: normalizedOutput.collectiveEvaluations,
    consensusDetails: {
      rankedAlternatives: normalizedOutput.rankedWithScores,
      matrices,
      collective_scores: normalizedOutput.collectiveScoresByName,
      collective_ranking: normalizedOutput.collectiveRanking,
      ...(normalizedOutput.plotsGraphic
        ? { plotsGraphic: normalizedOutput.plotsGraphic }
        : {}),
      modelExecution,
    },
    consensusLevel: normalizedOutput.consensusLevel,
  };
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
export const resolveDirectIssueFlow = async ({
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

  const { matricesUsed: matrices } = await buildScenarioDirectMatrices({
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
  } = buildDirectResolutionArtifacts({
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

  const consensus = new Consensus({
    issue: issue._id,
    phase: currentPhase,
    level: consensusLevel,
    timestamp: new Date(),
    details: consensusDetails,
    collectiveEvaluations,
  });

  await consensus.save();

  if (issue.isConsensus) {
    if (forceFinalize) {
      issue.active = false;
      await issue.save();

      return {
        finished: true,
        message: `Issue '${issue.name}' resolved as final round due to closure date.`,
        rankedAlternatives,
      };
    }

    if (issue.consensusMaxPhases && currentPhase >= issue.consensusMaxPhases) {
      issue.active = false;
      await issue.save();

      return {
        finished: true,
        message: `Issue '${issue.name}' resolved: maximum number of consensus rounds reached.`,
        rankedAlternatives,
      };
    }

    if (results.cm && results.cm >= issue.consensusThreshold) {
      issue.active = false;
      await issue.save();

      return {
        finished: true,
        message: `Issue '${issue.name}' resolved: consensus threshold ${issue.consensusThreshold} reached.`,
        rankedAlternatives,
      };
    }

    await Participation.updateMany(
      { issue: issue._id },
      { $set: { evaluationCompleted: false } }
    );

    return {
      finished: false,
      message: `Issue '${issue.name}' consensus threshold not reached. Another round is needed.`,
    };
  }

  issue.active = false;
  issue.currentStage = "finished";
  await issue.save();

  return {
    finished: true,
    message: `Issue '${issue.name}' resolved.`,
    rankedAlternatives,
  };
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
export const resolvePairwiseIssueFlow = async ({
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

  const modelKey = getModelEndpointKey(model);
  const modelEndpointUrl = buildModelEndpointUrl(apiModelsBaseUrl, model);

  if (!modelKey || !modelEndpointUrl) {
    throw createBadRequestError(
      `No API endpoint defined for model ${model.name}`
    );
  }

  const { matricesUsed: matrices } = await buildScenarioPairwiseMatrices({
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
  } = buildPairwiseResolutionArtifacts({
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

  const consensus = new Consensus({
    issue: issue._id,
    phase: currentPhase,
    level: consensusLevel,
    timestamp: new Date(),
    collectiveEvaluations,
    details: consensusDetails,
  });

  await consensus.save();

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

  if (issue.isConsensus && forceFinalize) {
    issue.active = false;
    await issue.save();

    return {
      finished: true,
      message: `Issue '${issue.name}' resolved as final round due to closure date.`,
      rankedAlternatives: rankedWithScores,
    };
  }

  if (issue.consensusMaxPhases && currentPhase >= issue.consensusMaxPhases) {
    issue.active = false;
    await issue.save();

    return {
      finished: true,
      message: `Issue '${issue.name}' resolved: maximum number of consensus rounds reached.`,
      rankedAlternatives: rankedWithScores,
    };
  }

  if (consensusLevel >= issue.consensusThreshold) {
    issue.active = false;
    issue.currentStage = "finished";
    await issue.save();

    return {
      finished: true,
      message: `Issue '${issue.name}' resolved: consensus threshold ${issue.consensusThreshold} reached.`,
      rankedAlternatives: rankedWithScores,
    };
  }

  await Participation.updateMany(
    { issue: issue._id },
    { $set: { evaluationCompleted: false } }
  );

  return {
    finished: false,
    message: `Issue '${issue.name}' consensus threshold not reached. Another round is needed.`,
  };
};
