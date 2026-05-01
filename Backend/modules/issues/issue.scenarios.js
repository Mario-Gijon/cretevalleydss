         
import { Consensus } from "../../models/Consensus.js";
import { Evaluation } from "../../models/Evaluations.js";
import { Issue } from "../../models/Issues.js";
import { IssueModel } from "../../models/IssueModels.js";
import { IssueScenario } from "../../models/IssueScenarios.js";
import { Participation } from "../../models/Participations.js";
import { IssueExpressionDomain } from "../../models/IssueExpressionDomains.js";

          
import {
  EVALUATION_STRUCTURES,
} from "./issue.evaluationStructure.js";
import { buildDirectResolutionData } from "./alternativeEvaluations/direct/direct.resolutionData.js";
import { buildPairwiseAlternativesResolutionData } from "./alternativeEvaluations/pairwiseAlternatives/pairwiseAlternatives.resolutionData.js";

        
import {
  ensureIssueOrdersDb,
  getOrderedAlternativesDb,
  getOrderedLeafCriteriaDb,
} from "../../modules/issues/issue.ordering.js";
import {
  createBadRequestError,
  createForbiddenError,
  createNotFoundError,
} from "../../utils/common/errors.js";
import { sameId, toIdString } from "../../utils/common/ids.js";
import { isValidObjectIdLike } from "../../utils/common/mongoose.js";
import {
  buildModelEndpointUrl,
  getModelEndpointKey,
} from "../../services/modelApi/modelCatalog.js";
import {
  createModelApiRequestError,
  unwrapModelApiResponse,
} from "../../services/modelApi/modelResponse.js";
import { buildModelInputPayload } from "./resolution/modelInputs/modelInput.adapters.js";
import { normalizeModelOutput } from "./resolution/modelOutputs/modelOutput.adapters.js";
import { validateAndNormalizeModelParametersOrThrow } from "./modelParameters/modelParameters.validation.js";

                     
import axios from "axios";

/**
 * @typedef {Object} ScenarioMatricesResult
 * @property {Object} matricesUsed Matrices construidas para el escenario.
 * @property {string[]} snapshotIdsUsed Snapshots utilizados.
 */

/**
 * @typedef {Object} ScenarioExecutionResult
 * @property {string} apiModelKey Clave del endpoint del modelo.
 * @property {Object} results Resultado bruto devuelto por el modelo.
 */

/**
 * @typedef {Object} ScenarioOutputs
 * @property {Object} details Detalle persistible del escenario.
 * @property {Object|null} collectiveEvaluations Evaluaciones colectivas derivadas, si existen.
 */

/**
 * @typedef {Object} IssueScenarioCreateResult
 * @property {*} scenarioId Id del escenario creado.
 */

/**
 * Ajusta la longitud de un array rellenando o truncando según corresponda.
 *
 * @param {unknown[]} arr Array de entrada.
 * @param {number} len Longitud deseada.
 * @param {unknown} [filler=null] Valor de relleno.
 * @returns {unknown[]}
 */
const ensureLen = (arr, len, filler = null) => {
  const normalized = Array.isArray(arr) ? [...arr] : [];

  if (normalized.length < len) {
    return [...normalized, ...Array(len - normalized.length).fill(filler)];
  }

  if (normalized.length > len) {
    return normalized.slice(0, len);
  }

  return normalized;
};

/**
 * Resuelve los parámetros por defecto de un modelo según el número de criterios hoja.
 *
 * @param {object} params Parámetros de entrada.
 * @param {Object} params.modelDoc Documento del modelo.
 * @param {number} params.leafCount Número de criterios hoja.
 * @returns {Object}
 */
export const buildDefaultsResolved = ({ modelDoc, leafCount }) => {
  const resolved = {};
  const safeLeafCount = Number.isInteger(leafCount) && leafCount > 0 ? leafCount : 0;

  for (const parameter of modelDoc?.parameters || []) {
    const { type, default: defaultValue } = parameter;
    const name = normalizeNonEmptyString(parameter?.key) || normalizeNonEmptyString(parameter?.name);
    if (!name) continue;

    if (type === "number") {
      resolved[name] = defaultValue ?? null;
      continue;
    }

    if (type === "array") {
      const length =
        parameter?.restrictions?.length === "matchCriteria"
          ? leafCount
          : (typeof parameter?.restrictions?.length === "number"
            ? parameter.restrictions.length
            : null) ??
          (Array.isArray(defaultValue) ? defaultValue.length : 2);

      const base = Array.isArray(defaultValue) ? defaultValue : [];
      const isCriteriaWeights =
        name === "weights" && parameter?.restrictions?.length === "matchCriteria";

      if (isCriteriaWeights && typeof defaultValue === "string" && defaultValue.trim().toLowerCase() === "equal" && safeLeafCount > 0) {
        const equalWeights = Array.from({ length: safeLeafCount }, () => 1 / safeLeafCount);
        resolved[name] = ensureLen(equalWeights, length, null);
        continue;
      }

      resolved[name] = ensureLen(base, length, null);
      continue;
    }

    if (type === "fuzzyArray") {
      const length =
        parameter?.restrictions?.length === "matchCriteria"
          ? leafCount
          : (typeof parameter?.restrictions?.length === "number"
            ? parameter.restrictions.length
            : null) ??
          (Array.isArray(defaultValue) ? defaultValue.length : 1);

      const base = Array.isArray(defaultValue) ? defaultValue : [];
      resolved[name] = ensureLen(base, length, [null, null, null]).map(
        (triangle) =>
          Array.isArray(triangle) && triangle.length === 3
            ? triangle
            : [null, null, null]
      );
      continue;
    }

    resolved[name] = defaultValue ?? null;
  }

  return resolved;
};

/**
 * Fusiona parámetros guardados con sus valores resueltos por defecto.
 *
 * @param {object} params Parámetros de entrada.
 * @param {Object} params.defaultsResolved Defaults resueltos.
 * @param {Object} params.savedParams Parámetros guardados.
 * @returns {Object}
 */
export const mergeParamsResolved = ({ defaultsResolved, savedParams }) => {
  const merged = { ...(defaultsResolved || {}) };

  for (const [key, value] of Object.entries(savedParams || {})) {
    merged[key] = value;
  }

  return merged;
};

const getModelParameterKeys = (modelDoc) => {
  return new Set(
    (modelDoc?.parameters || [])
      .map((parameter) =>
        normalizeNonEmptyString(parameter?.key) ||
        normalizeNonEmptyString(parameter?.name)
      )
      .filter(Boolean)
  );
};

const normalizeScenarioParamOverridesOrThrow = (paramOverrides) => {
  if (paramOverrides == null) {
    return {};
  }

  if (typeof paramOverrides !== "object" || Array.isArray(paramOverrides)) {
    throw createBadRequestError("paramOverrides must be an object", {
      field: "paramOverrides",
    });
  }

  return paramOverrides;
};

/**
 * Resuelve weights como array a partir de paramsUsed y criterios ordenados.
 *
 * @param {object} params Parámetros de entrada.
 * @param {Object} params.paramsUsed Parámetros usados.
 * @param {Array<Object>} params.criteria Criterios ordenados.
 * @returns {Array<*> | null}
 */
export const resolveScenarioWeightsArray = ({ paramsUsed, criteria }) => {
  const weights = paramsUsed?.weights;

  if (Array.isArray(weights)) {
    return weights;
  }

  if (weights && typeof weights === "object") {
    return criteria.map((criterion) =>
      weights[criterion.name] != null ? weights[criterion.name] : null
    );
  }

  return null;
};

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

/**
 * Construye matrices directas para escenarios preservando la lógica actual.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string|Object} params.issueId Id del issue.
 * @param {Array<Object>} params.alternatives Alternativas ordenadas.
 * @param {Array<Object>} params.criteria Criterios hoja ordenados.
 * @param {Array<Object>} params.participations Participaciones aceptadas con expert populado.
 * @param {number} params.currentPhase Fase de consenso 1-based a consultar.
 * @returns {Promise<ScenarioMatricesResult>}
 */
export const buildScenarioDirectMatrices = ({
  issueId,
  alternatives,
  criteria,
  participations,
  currentPhase,
  inputKind,
}) =>
  buildDirectResolutionData({
    issueId,
    alternatives,
    criteria,
    participations,
    currentPhase,
    inputKind,
  });

/**
 * Construye matrices pairwise para escenarios preservando la lógica actual.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string|Object} params.issueId Id del issue.
 * @param {Array<Object>} params.alternatives Alternativas ordenadas.
 * @param {Array<Object>} params.criteria Criterios hoja ordenados.
 * @param {Array<Object>} params.participations Participaciones aceptadas con expert populado.
 * @param {number} params.currentPhase Fase de consenso 1-based a consultar.
 * @returns {Promise<ScenarioMatricesResult>}
 */
export const buildScenarioPairwiseMatrices = ({
  issueId,
  alternatives,
  criteria,
  participations,
  currentPhase,
  inputKind,
}) =>
  buildPairwiseAlternativesResolutionData({
    issueId,
    alternatives,
    criteria,
    participations,
    currentPhase,
    inputKind,
  });

/**
 * Construye el array de tipos de criterio compatible con modelos directos.
 *
 * @param {Array<Object>} criteria Criterios hoja ordenados.
 * @returns {string[]}
 */
const buildCriterionTypes = (criteria) =>
  criteria.map((criterion) =>
    criterion.type === "benefit" ? "max" : "min"
  );

/**
 * Cuenta valores pendientes en matrices directas.
 *
 * @param {Object} matricesUsed Matrices por experto.
 * @returns {number}
 */
const countPendingDirectValues = (matricesUsed) =>
  Object.values(matricesUsed).reduce((acc, matrix) => {
    for (const row of matrix) {
      for (const value of row) {
        if (value == null) acc += 1;
      }
    }
    return acc;
  }, 0);

/**
 * Cuenta valores pendientes en matrices pairwise ignorando la diagonal.
 *
 * @param {Object} matricesUsed Matrices por experto y criterio.
 * @returns {number}
 */
const countPendingPairwiseValues = (matricesUsed) => {
  let nullCount = 0;

  for (const expertEmail of Object.keys(matricesUsed || {})) {
    for (const criterionName of Object.keys(matricesUsed[expertEmail] || {})) {
      const matrix = matricesUsed[expertEmail][criterionName] || [];

      for (let rowIndex = 0; rowIndex < matrix.length; rowIndex += 1) {
        for (let colIndex = 0; colIndex < matrix.length; colIndex += 1) {
          if (rowIndex === colIndex) continue;
          if (matrix[rowIndex][colIndex] == null) {
            nullCount += 1;
          }
        }
      }
    }
  }

  return nullCount;
};

/**
 * Convierte plots_graphic.expert_points a un mapa indexado por email.
 *
 * @param {Array<Object>} participations Participaciones aceptadas.
 * @param {Object|null|undefined} plotsGraphic Gráfico bruto del modelo.
 * @returns {Object|null}
 */
/**
 * Construye el payload de un escenario para listados o detalle.
 *
 * @param {Object} scenarioDoc Documento del escenario.
 * @returns {Object}
 */
const buildScenarioPayload = (scenarioDoc) => {
  const evaluationStructure = scenarioDoc.evaluationStructure;

  return {
    ...scenarioDoc,
    evaluationStructure,
  };
};

const normalizeNonEmptyString = (value) => {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const normalizeEndpointPath = (value) => {
  const normalizedPath = normalizeNonEmptyString(value);
  if (!normalizedPath) return null;

  const clean = normalizedPath.replace(/^\/+|\/+$/g, "");
  return clean ? `/${clean}` : null;
};

const buildTargetModelRuntimeSnapshotOrThrow = (targetModel) => {
  const targetApiModelKey = normalizeNonEmptyString(targetModel?.apiModelKey);
  const endpointPath = normalizeEndpointPath(targetModel?.apiEndpoint?.path);
  const targetInputKind = normalizeNonEmptyString(targetModel?.inputKind);
  const targetOutputKind = normalizeNonEmptyString(targetModel?.outputKind);
  const targetEvaluationStructure = normalizeNonEmptyString(
    targetModel?.evaluationStructure
  );
  const targetLifecycleKind = normalizeNonEmptyString(targetModel?.lifecycleKind);
  const targetModelFamilyKey = normalizeNonEmptyString(targetModel?.modelFamilyKey);
  const targetModelVersion = normalizeNonEmptyString(targetModel?.modelVersion);
  const targetVersionLabel = normalizeNonEmptyString(targetModel?.versionLabel);

  const missingFields = [];

  if (!targetApiModelKey) missingFields.push("apiModelKey");
  if (!endpointPath) missingFields.push("apiEndpoint.path");
  if (!targetInputKind) missingFields.push("inputKind");
  if (!targetOutputKind) missingFields.push("outputKind");
  if (!targetEvaluationStructure) missingFields.push("evaluationStructure");
  if (!targetLifecycleKind) missingFields.push("lifecycleKind");
  if (!targetModelFamilyKey) missingFields.push("modelFamilyKey");
  if (!targetModelVersion) missingFields.push("modelVersion");
  if (!targetVersionLabel) missingFields.push("versionLabel");

  if (missingFields.length > 0) {
    throw createBadRequestError(
      "Target model runtime metadata is invalid for scenario execution",
      {
        field: "targetModelId",
        details: {
          missingFields,
          targetModelId: toIdString(targetModel?._id),
        },
      }
    );
  }

  return {
    targetApiModelKey,
    targetApiEndpoint: {
      method: normalizeNonEmptyString(targetModel?.apiEndpoint?.method) ?? null,
      path: endpointPath,
      operationId:
        normalizeNonEmptyString(targetModel?.apiEndpoint?.operationId) ?? null,
    },
    targetInputKind,
    targetOutputKind,
    targetEvaluationStructure,
    targetLifecycleKind,
    targetModelFamilyKey,
    targetModelVersion,
    targetVersionLabel,
  };
};

const buildTargetRuntimeModelFromSnapshot = ({
  targetModelName,
  targetRuntimeSnapshot,
}) => ({
  name: targetModelName || "unknown",
  apiModelKey: targetRuntimeSnapshot.targetApiModelKey,
  apiEndpoint: { ...targetRuntimeSnapshot.targetApiEndpoint },
  inputKind: targetRuntimeSnapshot.targetInputKind,
  outputKind: targetRuntimeSnapshot.targetOutputKind,
  evaluationStructure: targetRuntimeSnapshot.targetEvaluationStructure,
  lifecycleKind: targetRuntimeSnapshot.targetLifecycleKind,
  modelFamilyKey: targetRuntimeSnapshot.targetModelFamilyKey,
  modelVersion: targetRuntimeSnapshot.targetModelVersion,
  versionLabel: targetRuntimeSnapshot.targetVersionLabel,
});

/**
 * Obtiene el modelo objetivo para una simulación.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string | null | undefined} params.targetModelId Id del modelo objetivo.
 * @returns {Promise<Object>}
 */
const getTargetScenarioModelOrThrow = async ({
  targetModelId,
}) => {
  const cleanTargetModelId = String(targetModelId || "").trim();

  if (!cleanTargetModelId) {
    throw createBadRequestError("targetModelId is required", {
      field: "targetModelId",
    });
  }

  if (!isValidObjectIdLike(cleanTargetModelId)) {
    throw createBadRequestError("targetModelId must be a valid id", {
      field: "targetModelId",
      details: {
        targetModelId: cleanTargetModelId,
      },
    });
  }

  const targetModel = await IssueModel.findById(cleanTargetModelId);

  if (!targetModel) {
    throw createBadRequestError("Target model not found", {
      field: "targetModelId",
      details: {
        targetModelId: cleanTargetModelId,
      },
    });
  }

  return targetModel;
};

const resolveScenarioEvaluationPhaseOrThrow = ({ issue, consensusCount }) => {
  const phase = Number(issue?.consensusPhase);

  if (!Number.isInteger(phase) || phase < 1) {
    throw createBadRequestError("Issue consensusPhase is invalid", {
      field: "consensusPhase",
      details: {
        consensusPhase: issue?.consensusPhase ?? null,
      },
    });
  }

  if (Boolean(issue?.isConsensus) && Number(consensusCount) > 1) {
    throw createBadRequestError(
      "Simulation disabled: consensus issues with more than 1 saved phase are not supported yet."
    );
  }

  return phase;
};

/**
 * Carga y valida el contexto necesario para crear un escenario.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string} params.issueId Id del issue.
 * @param {string} params.userId Id del usuario actual.
 * @param {string | null | undefined} params.targetModelId Id del modelo objetivo.
 * @param {Object} params.paramOverrides Overrides de parámetros.
 * @returns {Promise<Object>}
 */
const getCreateScenarioContext = async ({
  issueId,
  userId,
  targetModelId,
  paramOverrides,
}) => {
  if (!issueId || !isValidObjectIdLike(issueId)) {
    throw createBadRequestError("Valid issue id is required", {
      field: "issueId",
    });
  }

  const issue = await Issue.findById(issueId).populate("model");
  if (!issue) {
    throw createNotFoundError("Issue not found", {
      field: "issueId",
    });
  }

  if (!sameId(issue.admin, userId)) {
    throw createForbiddenError(
      "Not authorized: only admin can create scenarios"
    );
  }

  const [targetModel, consensusCount, pendingInvitations, participations] =
    await Promise.all([
      getTargetScenarioModelOrThrow({
        targetModelId,
      }),
      Consensus.countDocuments({ issue: issue._id }),
      Participation.countDocuments({
        issue: issue._id,
        invitationStatus: "pending",
      }),
      Participation.find({
        issue: issue._id,
        invitationStatus: "accepted",
      }).populate("expert", "email"),
    ]);

  const evaluationPhase = resolveScenarioEvaluationPhaseOrThrow({
    issue,
    consensusCount,
  });

  if (pendingInvitations > 0) {
    throw createBadRequestError(
      "Simulation requires no pending invitations."
    );
  }

  if (!participations.length) {
    throw createBadRequestError("No accepted experts found");
  }

  const issueEvaluationStructure = issue.evaluationStructure;

  const targetRuntimeSnapshot = buildTargetModelRuntimeSnapshotOrThrow(
    targetModel
  );
  const targetEvaluationStructure = targetRuntimeSnapshot.targetEvaluationStructure;

  if (targetEvaluationStructure !== issueEvaluationStructure) {
    throw createBadRequestError(
      "Incompatible models: evaluation structure does not match this issue input type.",
      {
        field: "targetModel",
      }
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

  const expertIds = participations
    .map((participation) => participation.expert?._id)
    .filter(Boolean);

  let domainType = null;
  try {
    const detected = await detectIssueDomainTypeOrThrow({
      issueId: issue._id,
      expertIds,
    });
    domainType = detected.domainType;
  } catch (error) {
    domainType = null;
  }

  if (domainType && targetModel?.supportedDomains) {
    const supportsDomain = Boolean(
      targetModel.supportedDomains?.[domainType]?.enabled
    );

    if (!supportsDomain) {
      throw createBadRequestError(
        `Target model does not support '${domainType}' domains. Pick a compatible model.`,
        {
          field: "targetModel",
        }
      );
    }
  }

  const normalizedOverrides = normalizeScenarioParamOverridesOrThrow(paramOverrides);
  const targetParameterKeys = getModelParameterKeys(targetModel);
  const baseIssueParameters = Object.fromEntries(
    Object.entries(issue.modelParameters || {}).filter(([key]) =>
      targetParameterKeys.has(key)
    )
  );
  const rawScenarioParams = {
    ...baseIssueParameters,
    ...normalizedOverrides,
  };
  const normalizedScenarioParameters =
    validateAndNormalizeModelParametersOrThrow({
      model: targetModel,
      paramValues: rawScenarioParams,
      criteriaNodes: criteria,
      alternativesCount: alternatives.length,
    });

  const resolvedWeights = resolveScenarioWeightsArray({
    paramsUsed: normalizedScenarioParameters,
    criteria,
  });

  if (resolvedWeights) {
    normalizedScenarioParameters.weights = resolvedWeights;
  }

  return {
    issue,
    targetModel,
    targetRuntimeModel: buildTargetRuntimeModelFromSnapshot({
      targetModelName: targetModel.name,
      targetRuntimeSnapshot,
    }),
    participations,
    alternatives,
    criteria,
    issueEvaluationStructure,
    targetEvaluationStructure,
    criterionTypes: buildCriterionTypes(criteria),
    domainType,
    paramsUsed: normalizedScenarioParameters,
    normalizedParams: normalizedScenarioParameters,
    expertsOrder: participations.map(
      (participation) => participation.expert.email
    ),
    consensusThresholdUsed: 1,
    evaluationPhase,
    targetRuntimeSnapshot,
  };
};

/**
 * Resuelve las matrices de entrada de una simulación y valida que estén completas.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string|Object} params.issueId Id del issue.
 * @param {string} params.issueEvaluationStructure Estructura de evaluación del issue.
 * @param {Array<Object>} params.alternatives Alternativas ordenadas.
 * @param {Array<Object>} params.criteria Criterios hoja ordenados.
 * @param {Array<Object>} params.participations Participaciones aceptadas.
 * @param {number} params.evaluationPhase Fase 1-based usada para leer evaluaciones.
 * @returns {Promise<ScenarioMatricesResult>}
 */
const resolveScenarioMatricesOrThrow = async ({
  issueId,
  issueEvaluationStructure,
  alternatives,
  criteria,
  participations,
  evaluationPhase,
  targetInputKind,
}) => {
  if (issueEvaluationStructure === EVALUATION_STRUCTURES.DIRECT) {
    const directResult = await buildScenarioDirectMatrices({
      issueId,
      alternatives,
      criteria,
      participations,
      currentPhase: evaluationPhase,
      inputKind: targetInputKind,
    });

    const nullCount = countPendingDirectValues(directResult.matricesUsed);

    if (nullCount > 0) {
      throw createBadRequestError(
        "Simulation requires complete evaluations (some values are still null)."
      );
    }

    return directResult;
  }

  const pairwiseResult = await buildScenarioPairwiseMatrices({
    issueId,
    alternatives,
    criteria,
    participations,
    currentPhase: evaluationPhase,
    inputKind: targetInputKind,
  });

  const nullCount = countPendingPairwiseValues(pairwiseResult.matricesUsed);

  if (nullCount > 0) {
    throw createBadRequestError(
      "Simulation requires complete pairwise evaluations (some values are still null)."
    );
  }

  return pairwiseResult;
};

/**
 * Ejecuta el modelo objetivo para crear un escenario.
 *
 * @param {object} params Parámetros de entrada.
 * @param {Object} params.targetRuntimeModel Snapshot runtime del modelo objetivo.
 * @param {Object} params.matricesUsed Matrices de entrada.
 * @param {Object} params.normalizedParams Parámetros normalizados.
 * @param {string[]} params.criterionTypes Tipos de criterio.
 * @param {number} params.consensusThresholdUsed Umbral de consenso usado.
 * @returns {Promise<ScenarioExecutionResult>}
 */
const executeScenarioModelOrThrow = async ({
  targetRuntimeModel,
  matricesUsed,
  normalizedParams,
  criterionTypes,
  consensusThresholdUsed,
}) => {
  const apiModelKey = getModelEndpointKey(targetRuntimeModel);
  const apimodelsUrl =
    process.env.ORIGIN_APIMODELS || "http://localhost:7000";
  const modelEndpointUrl = buildModelEndpointUrl(apimodelsUrl, targetRuntimeModel);

  if (!apiModelKey || !modelEndpointUrl) {
    throw createBadRequestError(
      `No API endpoint defined for target model ${targetRuntimeModel?.name}`
    );
  }

  const modelInputPayload = buildModelInputPayload({
    inputKind: targetRuntimeModel?.inputKind,
    matrices: matricesUsed,
    modelParameters: normalizedParams,
    criterionTypes,
    consensusThreshold: consensusThresholdUsed,
  });

  let response;

  try {
    response = await axios.post(
        modelEndpointUrl,
        modelInputPayload,
        {
          headers: { "Content-Type": "application/json" },
        }
      );
  } catch (error) {
    throw createModelApiRequestError(error, "Error creating scenario");
  }

  const results = unwrapModelApiResponse(response);

  return {
    apiModelKey,
    results,
  };
};

/**
 * Construye los outputs persistibles del escenario a partir del resultado del modelo.
 *
 * @param {object} params Parámetros de entrada.
 * @param {Object} params.targetRuntimeModel Snapshot runtime del modelo objetivo.
 * @param {Object} params.results Resultado bruto.
 * @param {Array<Object>} params.alternatives Alternativas ordenadas.
 * @param {Array<Object>} params.criteria Criterios hoja ordenados.
 * @param {Array<Object>} params.participations Participaciones aceptadas.
 * @param {Object} params.matricesUsed Matrices usadas.
 * @returns {ScenarioOutputs}
 */
const buildScenarioOutputs = ({
  targetRuntimeModel,
  results,
  alternatives,
  criteria,
  participations,
  matricesUsed,
  modelParameters,
  issue,
}) => {
  const normalizedOutput = normalizeModelOutput({
    outputKind: targetRuntimeModel?.outputKind,
    rawOutput: results,
    alternatives,
    criteria,
    participations,
    issue,
    model: targetRuntimeModel,
  });

  return {
    collectiveEvaluations: normalizedOutput.collectiveEvaluations,
    details: {
      rankedAlternatives: normalizedOutput.rankedWithScores,
      matrices: matricesUsed,
      collective_scores: normalizedOutput.collectiveScoresByName,
      collective_ranking: normalizedOutput.collectiveRanking,
      ...(normalizedOutput.consensusLevel != null
        ? { level: normalizedOutput.consensusLevel }
        : {}),
      ...(normalizedOutput.plotsGraphic
        ? { plotsGraphic: normalizedOutput.plotsGraphic }
        : {}),
      modelExecution: {
        apiModelKey: targetRuntimeModel?.apiModelKey ?? null,
        modelKey: targetRuntimeModel?.apiModelKey ?? null,
        modelName: targetRuntimeModel?.name ?? null,
        inputKind: targetRuntimeModel?.inputKind ?? null,
        outputKind: targetRuntimeModel?.outputKind ?? null,
        apiEndpoint: targetRuntimeModel?.apiEndpoint ?? null,
        apiEndpointPath: targetRuntimeModel?.apiEndpoint?.path ?? null,
        modelParameters: modelParameters ?? null,
        executedAt: new Date(),
        rawOutput: results,
      },
    },
  };
};

/**
 * Crea un escenario de simulación para un issue resuelto.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string} params.userId Id del usuario actual.
 * @param {string} params.issueId Id del issue.
 * @param {string | null | undefined} params.targetModelId Id del modelo objetivo.
 * @param {string} [params.scenarioName=""] Nombre opcional del escenario.
 * @param {Object} [params.paramOverrides={}] Overrides de parámetros.
 * @returns {Promise<IssueScenarioCreateResult>}
 */
export const createIssueScenarioFlow = async ({
  userId,
  issueId,
  targetModelId,
  scenarioName = "",
  paramOverrides = {},
}) => {
  const context = await getCreateScenarioContext({
    issueId,
    userId,
    targetModelId,
    paramOverrides,
  });

  const { matricesUsed, snapshotIdsUsed } = await resolveScenarioMatricesOrThrow({
    issueId: context.issue._id,
    issueEvaluationStructure: context.issueEvaluationStructure,
    alternatives: context.alternatives,
    criteria: context.criteria,
    participations: context.participations,
    evaluationPhase: context.evaluationPhase,
    targetInputKind: context.targetRuntimeModel?.inputKind,
  });

  const { results } = await executeScenarioModelOrThrow({
    targetRuntimeModel: context.targetRuntimeModel,
    matricesUsed,
    normalizedParams: context.normalizedParams,
    criterionTypes: context.criterionTypes,
    consensusThresholdUsed: context.consensusThresholdUsed,
  });

  const { details, collectiveEvaluations } = buildScenarioOutputs({
    targetRuntimeModel: context.targetRuntimeModel,
    results,
    alternatives: context.alternatives,
    criteria: context.criteria,
    participations: context.participations,
    matricesUsed,
    modelParameters: context.normalizedParams,
    issue: {
      isConsensus: context.targetRuntimeModel?.outputKind === "consensusRanking",
    },
  });

  const scenario = await IssueScenario.create({
    issue: context.issue._id,
    createdBy: userId,
    name: String(scenarioName || "").trim(),
    targetModel: context.targetModel._id,
    targetModelName: context.targetModel.name,
    targetApiModelKey: context.targetRuntimeSnapshot.targetApiModelKey,
    targetApiEndpoint: context.targetRuntimeSnapshot.targetApiEndpoint,
    targetInputKind: context.targetRuntimeSnapshot.targetInputKind,
    targetOutputKind: context.targetRuntimeSnapshot.targetOutputKind,
    targetEvaluationStructure:
      context.targetRuntimeSnapshot.targetEvaluationStructure,
    targetLifecycleKind: context.targetRuntimeSnapshot.targetLifecycleKind,
    targetModelFamilyKey: context.targetRuntimeSnapshot.targetModelFamilyKey,
    targetModelVersion: context.targetRuntimeSnapshot.targetModelVersion,
    targetVersionLabel: context.targetRuntimeSnapshot.targetVersionLabel,
    domainType: context.domainType,
    evaluationStructure: context.targetEvaluationStructure,
    status: "done",
    config: {
      modelParameters: context.paramsUsed,
      normalizedModelParameters: context.normalizedParams,
      criterionTypes:
        context.issueEvaluationStructure ===
          EVALUATION_STRUCTURES.PAIRWISE_ALTERNATIVES
          ? []
          : context.criterionTypes,
    },
    inputs: {
      consensusPhaseUsed: context.evaluationPhase,
      expertsOrder: context.expertsOrder,
      alternatives: context.alternatives.map((alternative) => ({
        id: alternative._id,
        name: alternative.name,
      })),
      criteria: context.criteria.map((criterion) => ({
        id: criterion._id,
        name: criterion.name,
        criterionType: criterion.type,
      })),
      weightsUsed: context.paramsUsed?.weights ?? null,
      matricesUsed,
      snapshotIdsUsed,
    },
    outputs: {
      details,
      collectiveEvaluations,
      rawResults: results,
    },
  });

  return {
    scenarioId: scenario._id,
  };
};

/**
 * Lista los escenarios creados para un issue.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string} params.issueId Id del issue.
 * @returns {Promise<Object>}
 */
export const getIssueScenariosPayload = async ({ issueId }) => {
  if (!issueId || !isValidObjectIdLike(issueId)) {
    throw createBadRequestError("Valid issue id is required", {
      field: "issueId",
    });
  }

  const scenarioDocs = await IssueScenario.find({ issue: issueId })
    .sort({ createdAt: -1 })
    .select(
      "_id name targetModelName targetVersionLabel domainType evaluationStructure status createdAt createdBy"
    )
    .populate("createdBy", "email name")
    .lean();

  return {
    scenarios: scenarioDocs.map(buildScenarioPayload),
  };
};

/**
 * Obtiene un escenario por su id.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string} params.scenarioId Id del escenario.
 * @returns {Promise<Object>}
 */
export const getScenarioByIdPayload = async ({ scenarioId }) => {
  if (!scenarioId || !isValidObjectIdLike(scenarioId)) {
    throw createBadRequestError("Valid scenario id is required", {
      field: "scenarioId",
    });
  }

  const scenarioDoc = await IssueScenario.findById(scenarioId)
    .populate("createdBy", "email name")
    .lean();

  if (!scenarioDoc) {
    throw createNotFoundError("Scenario not found", {
      field: "scenarioId",
    });
  }

  return {
    scenario: buildScenarioPayload(scenarioDoc),
  };
};

/**
 * Elimina un escenario si el usuario actual es su creador o admin del issue.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string} params.scenarioId Id del escenario.
 * @param {string} params.userId Id del usuario actual.
 * @returns {Promise<void>}
 */
export const removeIssueScenarioFlow = async ({ scenarioId, userId }) => {
  if (!scenarioId || !isValidObjectIdLike(scenarioId)) {
    throw createBadRequestError("Valid scenario id is required", {
      field: "scenarioId",
    });
  }

  const scenario = await IssueScenario.findById(scenarioId);
  if (!scenario) {
    throw createNotFoundError("Scenario not found", {
      field: "scenarioId",
    });
  }

  const issue = await Issue.findById(scenario.issue).select("admin").lean();
  if (!issue) {
    throw createNotFoundError("Issue not found");
  }

  const isCreator = sameId(scenario.createdBy, userId);
  const isAdmin = sameId(issue.admin, userId);

  if (!isCreator && !isAdmin) {
    throw createForbiddenError("Not authorized to delete this scenario");
  }

  await IssueScenario.deleteOne({ _id: scenario._id });
};
