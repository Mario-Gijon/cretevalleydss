// Models
import { Consensus } from "../../models/Consensus.js";
import { Evaluation } from "../../models/Evaluations.js";
import { Issue } from "../../models/Issues.js";
import { IssueModel } from "../../models/IssueModels.js";
import { IssueScenario } from "../../models/IssueScenarios.js";
import { Participation } from "../../models/Participations.js";
import { IssueExpressionDomain } from "../../models/IssueExpressionDomains.js";

// Modules
import {
  EVALUATION_STRUCTURES,
  resolveEvaluationStructure,
} from "./issue.evaluationStructure.js";

// Utils
import {
  ensureIssueOrdersDb,
  getOrderedAlternativesDb,
  getOrderedLeafCriteriaDb,
} from "../../modules/issues/issue.ordering.js";
import { normalizeParams } from "../../services/modelApi/modelParamNormalizer.js";
import {
  createBadRequestError,
  createForbiddenError,
  createNotFoundError,
} from "../../utils/common/errors.js";
import { sameId, toIdString } from "../../utils/common/ids.js";
import { getModelEndpointKey } from "../../services/modelApi/modelCatalog.js";

// External libraries
import axios from "axios";

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
 * @param {Record<string, any>} params.modelDoc Documento del modelo.
 * @param {number} params.leafCount Número de criterios hoja.
 * @returns {Record<string, any>}
 */
export const buildDefaultsResolved = ({ modelDoc, leafCount }) => {
  const resolved = {};

  for (const parameter of modelDoc?.parameters || []) {
    const { name, type, default: defaultValue } = parameter;

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
 * @param {Record<string, any>} params.defaultsResolved Defaults resueltos.
 * @param {Record<string, any>} params.savedParams Parámetros guardados.
 * @returns {Record<string, any>}
 */
export const mergeParamsResolved = ({ defaultsResolved, savedParams }) => {
  const merged = { ...(defaultsResolved || {}) };

  for (const [key, value] of Object.entries(savedParams || {})) {
    merged[key] = value;
  }

  return merged;
};

/**
 * Resuelve weights como array a partir de paramsUsed y criterios ordenados.
 *
 * @param {object} params Parámetros de entrada.
 * @param {Record<string, any>} params.paramsUsed Parámetros usados.
 * @param {Array<Record<string, any>>} params.criteria Criterios ordenados.
 * @returns {any[] | null}
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
 * @returns {Promise<{ domainType: string, snapshotIdsUsed: Array<*> }>}
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
 * Valida los pesos usados por un modelo destino.
 *
 * @param {object} params Datos de entrada.
 * @param {Record<string, any>} params.targetModel Modelo destino.
 * @param {Record<string, any>} params.paramsUsed Parámetros usados.
 * @param {number} params.criteriaLen Número de criterios hoja.
 * @returns {void}
 */
export const validateWeightsForTargetModel = ({
  targetModel,
  paramsUsed,
  criteriaLen,
}) => {
  const weightsParam = (targetModel?.parameters || []).find(
    (parameter) => parameter?.name === "weights"
  );

  if (!weightsParam) return;

  const weights = paramsUsed?.weights;

  if (weights == null) {
    throw createBadRequestError(
      "Target model requires 'weights' but none were provided."
    );
  }

  if (!Array.isArray(weights)) {
    throw createBadRequestError("'weights' must be an array.");
  }

  if (weights.length !== criteriaLen) {
    throw createBadRequestError(
      `'weights' length must match number of leaf criteria (${criteriaLen}).`
    );
  }

  if (weightsParam.type === "array") {
    const isValid = weights.every(
      (value) => typeof value === "number" && Number.isFinite(value)
    );

    if (!isValid) {
      throw createBadRequestError(
        "Target model expects crisp numeric weights (array of numbers)."
      );
    }

    return;
  }

  if (weightsParam.type === "fuzzyArray") {
    const isValid = weights.every((value) => {
      if (Array.isArray(value)) {
        return (
          value.length === 3 &&
          value.every((n) => typeof n === "number" && Number.isFinite(n))
        );
      }

      if (value && typeof value === "object") {
        return true;
      }

      return false;
    });

    if (!isValid) {
      throw createBadRequestError(
        "Target model expects fuzzy weights (each weight must be [l,m,u] or an object)."
      );
    }
  }
};

/**
 * Construye matrices directas para escenarios preservando la lógica actual.
 *
 * @param {object} params Parámetros de entrada.
 * @param {import("mongoose").Types.ObjectId | string} params.issueId Id del issue.
 * @param {Array<Record<string, any>>} params.alternatives Alternativas ordenadas.
 * @param {Array<Record<string, any>>} params.criteria Criterios hoja ordenados.
 * @param {Array<Record<string, any>>} params.participations Participaciones aceptadas con expert populado.
 * @returns {Promise<{ matricesUsed: Record<string, Array<Array<any>>>, snapshotIdsUsed: string[] }>}
 */
export const buildScenarioDirectMatrices = async ({
  issueId,
  alternatives,
  criteria,
  participations,
}) => {
  const expertIds = participations
    .map((participation) => participation.expert?._id)
    .map(toIdString)
    .filter(Boolean);

  const evaluationDocs = await Evaluation.find({
    issue: issueId,
    expert: { $in: expertIds },
    comparedAlternative: null,
  })
    .select("expert alternative criterion value expressionDomain")
    .populate("expressionDomain", "type linguisticLabels numericRange name")
    .lean();

  const evaluationMap = new Map();
  const snapshotSet = new Set();

  for (const evaluation of evaluationDocs) {
    const key = `${toIdString(evaluation.expert)}_${toIdString(
      evaluation.alternative
    )}_${toIdString(evaluation.criterion)}`;

    evaluationMap.set(key, evaluation);

    if (evaluation.expressionDomain?._id) {
      snapshotSet.add(toIdString(evaluation.expressionDomain._id));
    }
  }

  const matricesUsed = {};

  for (const participation of participations) {
    const expertEmail = participation.expert.email;
    const expertId = toIdString(participation.expert._id);

    const matrixForExpert = [];

    for (const alternative of alternatives) {
      const row = [];

      for (const criterion of criteria) {
        const key = `${expertId}_${toIdString(alternative._id)}_${toIdString(
          criterion._id
        )}`;
        const evaluation = evaluationMap.get(key);

        let value = evaluation?.value ?? null;

        if (
          value != null &&
          evaluation?.expressionDomain?.type === "numeric" &&
          typeof value === "string"
        ) {
          const numericValue = Number(value);
          value = Number.isFinite(numericValue) ? numericValue : value;
        }

        if (
          value != null &&
          evaluation?.expressionDomain?.type === "linguistic"
        ) {
          const labelDefinition =
            evaluation.expressionDomain.linguisticLabels?.find(
              (label) => label.label === value
            );

          value = labelDefinition ? labelDefinition.values : null;
        }

        row.push(value);
      }

      matrixForExpert.push(row);
    }

    matricesUsed[expertEmail] = matrixForExpert;
  }

  return {
    matricesUsed,
    snapshotIdsUsed: Array.from(snapshotSet).filter(Boolean),
  };
};

/**
 * Construye matrices pairwise para escenarios preservando la lógica actual.
 *
 * @param {object} params Parámetros de entrada.
 * @param {import("mongoose").Types.ObjectId | string} params.issueId Id del issue.
 * @param {Array<Record<string, any>>} params.alternatives Alternativas ordenadas.
 * @param {Array<Record<string, any>>} params.criteria Criterios hoja ordenados.
 * @param {Array<Record<string, any>>} params.participations Participaciones aceptadas con expert populado.
 * @returns {Promise<{ matricesUsed: Record<string, Record<string, Array<Array<any>>>>, snapshotIdsUsed: string[] }>}
 */
export const buildScenarioPairwiseMatrices = async ({
  issueId,
  alternatives,
  criteria,
  participations,
}) => {
  const expertIds = participations
    .map((participation) => participation.expert?._id)
    .map(toIdString)
    .filter(Boolean);

  const evaluationDocs = await Evaluation.find({
    issue: issueId,
    expert: { $in: expertIds },
    comparedAlternative: { $ne: null },
  })
    .select("expert alternative comparedAlternative criterion value expressionDomain")
    .populate("expressionDomain", "type")
    .lean();

  const snapshotSet = new Set();

  for (const evaluation of evaluationDocs) {
    if (evaluation.expressionDomain?._id) {
      snapshotSet.add(toIdString(evaluation.expressionDomain._id));
    }
  }

  const alternativeIndexMap = new Map(
    alternatives.map((alternative, index) => [toIdString(alternative._id), index])
  );

  const criterionNameById = new Map(
    criteria.map((criterion) => [toIdString(criterion._id), criterion.name])
  );

  const participationByExpertId = new Map(
    participations
      .map((participation) => [toIdString(participation.expert?._id), participation])
      .filter(([expertId]) => Boolean(expertId))
  );

  const matricesUsed = {};

  for (const participation of participations) {
    matricesUsed[participation.expert.email] = {};

    for (const criterion of criteria) {
      const size = alternatives.length;

      matricesUsed[participation.expert.email][criterion.name] = Array.from(
        { length: size },
        (_, rowIndex) =>
          Array.from({ length: size }, (_, colIndex) =>
            rowIndex === colIndex ? 0.5 : null
          )
      );
    }
  }

  for (const evaluation of evaluationDocs) {
    const participation = participationByExpertId.get(toIdString(evaluation.expert));
    if (!participation) continue;

    const criterionName = criterionNameById.get(toIdString(evaluation.criterion));
    if (!criterionName) continue;

    const rowIndex = alternativeIndexMap.get(toIdString(evaluation.alternative));
    const colIndex = alternativeIndexMap.get(
      toIdString(evaluation.comparedAlternative)
    );

    if (rowIndex == null || colIndex == null) continue;

    let value = evaluation.value ?? null;

    if (value != null && typeof value === "string") {
      const numericValue = Number(value);
      value = Number.isFinite(numericValue) ? numericValue : value;
    }

    matricesUsed[participation.expert.email][criterionName][rowIndex][colIndex] =
      value;
  }

  return {
    matricesUsed,
    snapshotIdsUsed: Array.from(snapshotSet).filter(Boolean),
  };
};

/**
 * Crea un error enriquecido para los flujos de escenarios.
 *
 * @param {number} status Código HTTP.
 * @param {string} message Mensaje del error.
 * @returns {Error}
 */
const createScenarioError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

/**
 * Construye el array de tipos de criterio compatible con modelos directos.
 *
 * @param {Array<Record<string, any>>} criteria Criterios hoja ordenados.
 * @returns {string[]}
 */
const buildCriterionTypes = (criteria) =>
  criteria.map((criterion) =>
    criterion.type === "benefit" ? "max" : "min"
  );

/**
 * Cuenta valores pendientes en matrices directas.
 *
 * @param {Record<string, Array<Array<any>>>} matricesUsed Matrices por experto.
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
 * @param {Record<string, Record<string, Array<Array<any>>>>} matricesUsed Matrices por experto y criterio.
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
 * @param {Array<Record<string, any>>} participations Participaciones aceptadas.
 * @param {Record<string, any> | null | undefined} plotsGraphic Gráfico bruto del modelo.
 * @returns {Record<string, any> | null}
 */
const buildPlotsGraphicWithEmails = (participations, plotsGraphic) => {
  if (!plotsGraphic?.expert_points || !Array.isArray(plotsGraphic.expert_points)) {
    return null;
  }

  const expertPointsMap = {};

  participations.forEach((participation, index) => {
    expertPointsMap[participation.expert.email] =
      plotsGraphic.expert_points[index] ?? null;
  });

  return {
    expert_points: expertPointsMap,
    collective_point: plotsGraphic.collective_point ?? null,
  };
};

/**
 * Construye el payload de un escenario para listados o detalle.
 *
 * @param {Record<string, any>} scenarioDoc Documento del escenario.
 * @returns {Record<string, any>}
 */
const buildScenarioPayload = (scenarioDoc) => {
  const evaluationStructure = resolveEvaluationStructure(scenarioDoc);

  return {
    ...scenarioDoc,
    evaluationStructure,
    isPairwise:
      evaluationStructure === EVALUATION_STRUCTURES.PAIRWISE_ALTERNATIVES,
  };
};

/**
 * Obtiene el modelo objetivo para una simulación.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string | null | undefined} params.targetModelId Id del modelo objetivo.
 * @param {string | null | undefined} params.targetModelName Nombre del modelo objetivo.
 * @returns {Promise<Record<string, any>>}
 */
const getTargetScenarioModelOrThrow = async ({
  targetModelId,
  targetModelName,
}) => {
  let targetModel = null;

  if (targetModelId) {
    targetModel = await IssueModel.findById(targetModelId);
  }

  if (!targetModel && targetModelName) {
    targetModel = await IssueModel.findOne({ name: targetModelName });
  }

  if (!targetModel) {
    throw createNotFoundError("Target model not found");
  }

  return targetModel;
};

/**
 * Carga y valida el contexto necesario para crear un escenario.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string} params.issueId Id del issue.
 * @param {string} params.userId Id del usuario actual.
 * @param {string | null | undefined} params.targetModelId Id del modelo objetivo.
 * @param {string | null | undefined} params.targetModelName Nombre del modelo objetivo.
 * @param {Record<string, any>} params.paramOverrides Overrides de parámetros.
 * @returns {Promise<{
 *   issue: Record<string, any>,
 *   targetModel: Record<string, any>,
 *   participations: Array<Record<string, any>>,
 *   alternatives: Array<Record<string, any>>,
 *   criteria: Array<Record<string, any>>,
 *   issueEvaluationStructure: string,
 *   targetEvaluationStructure: string,
 *   criterionTypes: string[],
 *   domainType: string | null,
 *   paramsUsed: Record<string, any>,
 *   normalizedParams: Record<string, any>,
 *   expertsOrder: string[],
 *   consensusThresholdUsed: number,
 * }>}
 */
const getCreateScenarioContext = async ({
  issueId,
  userId,
  targetModelId,
  targetModelName,
  paramOverrides,
}) => {
  if (!issueId) {
    throw createBadRequestError("issueId is required");
  }

  const issue = await Issue.findById(issueId).populate("model");
  if (!issue) {
    throw createNotFoundError("Issue not found");
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
        targetModelName,
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

  if (issue.isConsensus && consensusCount > 1) {
    throw createBadRequestError(
      "Simulation disabled: consensus issues with more than 1 saved phase are not supported yet."
    );
  }

  if (pendingInvitations > 0) {
    throw createBadRequestError(
      "Simulation requires no pending invitations."
    );
  }

  if (!participations.length) {
    throw createBadRequestError("No accepted experts found");
  }

  const issueEvaluationStructure =
    issue.evaluationStructure || resolveEvaluationStructure(issue.model);

  const targetEvaluationStructure = resolveEvaluationStructure(targetModel);

  if (targetEvaluationStructure !== issueEvaluationStructure) {
    throw createBadRequestError(
      "Incompatible models: evaluation structure does not match this issue input type."
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
        `Target model does not support '${domainType}' domains. Pick a compatible model.`
      );
    }
  }

  const paramsUsed = {
    ...(issue.modelParameters || {}),
    ...(paramOverrides && typeof paramOverrides === "object"
      ? paramOverrides
      : {}),
  };

  const resolvedWeights = resolveScenarioWeightsArray({
    paramsUsed,
    criteria,
  });

  if (resolvedWeights) {
    paramsUsed.weights = resolvedWeights;
  }

  validateWeightsForTargetModel({
    targetModel,
    paramsUsed,
    criteriaLen: criteria.length,
  });

  return {
    issue,
    targetModel,
    participations,
    alternatives,
    criteria,
    issueEvaluationStructure,
    targetEvaluationStructure,
    criterionTypes: buildCriterionTypes(criteria),
    domainType,
    paramsUsed,
    normalizedParams: normalizeParams(paramsUsed),
    expertsOrder: participations.map(
      (participation) => participation.expert.email
    ),
    consensusThresholdUsed: 1,
  };
};

/**
 * Resuelve las matrices de entrada de una simulación y valida que estén completas.
 *
 * @param {object} params Parámetros de entrada.
 * @param {import("mongoose").Types.ObjectId | string} params.issueId Id del issue.
 * @param {string} params.issueEvaluationStructure Estructura de evaluación del issue.
 * @param {Array<Record<string, any>>} params.alternatives Alternativas ordenadas.
 * @param {Array<Record<string, any>>} params.criteria Criterios hoja ordenados.
 * @param {Array<Record<string, any>>} params.participations Participaciones aceptadas.
 * @returns {Promise<{
 *   matricesUsed: Record<string, any>,
 *   snapshotIdsUsed: string[],
 * }>}
 */
const resolveScenarioMatricesOrThrow = async ({
  issueId,
  issueEvaluationStructure,
  alternatives,
  criteria,
  participations,
}) => {
  if (issueEvaluationStructure === EVALUATION_STRUCTURES.DIRECT) {
    const directResult = await buildScenarioDirectMatrices({
      issueId,
      alternatives,
      criteria,
      participations,
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
 * @param {string} params.targetModelName Nombre del modelo objetivo.
 * @param {Record<string, any>} params.matricesUsed Matrices de entrada.
 * @param {Record<string, any>} params.normalizedParams Parámetros normalizados.
 * @param {string[]} params.criterionTypes Tipos de criterio.
 * @param {number} params.consensusThresholdUsed Umbral de consenso usado.
 * @returns {Promise<{
 *   modelKey: string,
 *   results: Record<string, any>,
 * }>}
 */
const executeScenarioModelOrThrow = async ({
  targetModelName,
  matricesUsed,
  normalizedParams,
  criterionTypes,
  consensusThresholdUsed,
}) => {
  const modelKey = getModelEndpointKey(targetModelName);

  if (!modelKey) {
    throw createBadRequestError(
      `No API endpoint defined for target model ${targetModelName}`
    );
  }

  const apimodelsUrl =
    process.env.ORIGIN_APIMODELS || "http://localhost:7000";

  let response;

  try {
    if (modelKey === "herrera_viedma_crp") {
      response = await axios.post(
        `${apimodelsUrl}/${modelKey}`,
        {
          matrices: matricesUsed,
          consensusThreshold: consensusThresholdUsed,
          modelParameters: normalizedParams,
        },
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    } else {
      response = await axios.post(
        `${apimodelsUrl}/${modelKey}`,
        {
          matrices: matricesUsed,
          modelParameters: normalizedParams,
          criterionTypes,
          criterion_type: criterionTypes,
          criterion_types: criterionTypes,
        },
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    const axiosMsg =
      error?.response?.data?.msg ||
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      "Error creating scenario";

    throw createScenarioError(
      error?.response?.status || 500,
      axiosMsg
    );
  }

  const { success, msg, results } = response.data || {};

  if (!success) {
    throw createBadRequestError(msg || "Model execution failed");
  }

  return {
    modelKey,
    results,
  };
};

/**
 * Construye los outputs persistibles del escenario a partir del resultado del modelo.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string} params.modelKey Clave del endpoint del modelo.
 * @param {Record<string, any>} params.results Resultado bruto.
 * @param {Array<Record<string, any>>} params.alternatives Alternativas ordenadas.
 * @param {Array<Record<string, any>>} params.criteria Criterios hoja ordenados.
 * @param {Array<Record<string, any>>} params.participations Participaciones aceptadas.
 * @param {Record<string, any>} params.matricesUsed Matrices usadas.
 * @returns {{
 *   details: Record<string, any>,
 *   collectiveEvaluations: Record<string, any> | null,
 * }}
 */
const buildScenarioOutputs = ({
  modelKey,
  results,
  alternatives,
  criteria,
  participations,
  matricesUsed,
}) => {
  const alternativeNames = alternatives.map((alternative) => alternative.name);

  if (modelKey === "herrera_viedma_crp") {
    const {
      alternatives_rankings,
      cm,
      collective_evaluations,
      plots_graphic,
      collective_scores,
    } = results || {};

    const rankedWithScores = (alternatives_rankings || []).map((index) => ({
      name: alternativeNames[index],
      score: collective_scores?.[index] ?? null,
    }));

    const transformedCollectiveEvaluations = {};

    for (const criterion of criteria) {
      const matrix = collective_evaluations?.[criterion.name];
      if (!matrix) continue;

      transformedCollectiveEvaluations[criterion.name] = matrix.map(
        (row, rowIndex) => {
          const formattedRow = { id: alternatives[rowIndex].name };

          row.forEach((value, colIndex) => {
            formattedRow[alternatives[colIndex].name] = value;
          });

          return formattedRow;
        }
      );
    }

    const plotsGraphicWithEmails = buildPlotsGraphicWithEmails(
      participations,
      plots_graphic
    );

    return {
      collectiveEvaluations: transformedCollectiveEvaluations,
      details: {
        rankedAlternatives: rankedWithScores,
        matrices: matricesUsed,
        level: cm ?? null,
        collective_scores: Object.fromEntries(
          alternativeNames.map((name, index) => [
            name,
            collective_scores?.[index] ?? null,
          ])
        ),
        collective_ranking: rankedWithScores.map((item) => item.name),
        ...(plotsGraphicWithEmails
          ? { plotsGraphic: plotsGraphicWithEmails }
          : {}),
      },
    };
  }

  const rankingIndexes = results?.collective_ranking || [];
  const collectiveScores = results?.collective_scores || [];
  const collectiveMatrix = results?.collective_matrix || [];

  const rankedAlternatives = rankingIndexes.map(
    (index) => alternativeNames[index]
  );

  const rankedWithScores = rankingIndexes.map((index) => ({
    name: alternativeNames[index],
    score: collectiveScores?.[index] ?? null,
  }));

  const collectiveScoresByName = {};
  alternativeNames.forEach((name, index) => {
    collectiveScoresByName[name] = collectiveScores?.[index] ?? null;
  });

  const formattedCollectiveEvaluations = {};
  collectiveMatrix.forEach((row, alternativeIndex) => {
    const alternativeName = alternativeNames[alternativeIndex];
    formattedCollectiveEvaluations[alternativeName] = {};

    row.forEach((value, criterionIndex) => {
      const criterionName = criteria[criterionIndex]?.name;
      if (criterionName) {
        formattedCollectiveEvaluations[alternativeName][criterionName] = {
          value,
        };
      }
    });
  });

  const plotsGraphicWithEmails = buildPlotsGraphicWithEmails(
    participations,
    results?.plots_graphic
  );

  return {
    collectiveEvaluations: formattedCollectiveEvaluations,
    details: {
      rankedAlternatives: rankedWithScores,
      matrices: matricesUsed,
      collective_scores: collectiveScoresByName,
      collective_ranking: rankedAlternatives,
      ...(plotsGraphicWithEmails
        ? { plotsGraphic: plotsGraphicWithEmails }
        : {}),
    },
  };
};

/**
 * Crea un escenario de simulación para un issue resuelto.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string} params.userId Id del usuario actual.
 * @param {string} params.issueId Id del issue.
 * @param {string | null | undefined} params.targetModelName Nombre del modelo objetivo.
 * @param {string | null | undefined} params.targetModelId Id del modelo objetivo.
 * @param {string} [params.scenarioName=""] Nombre opcional del escenario.
 * @param {Record<string, any>} [params.paramOverrides={}] Overrides de parámetros.
 * @returns {Promise<{ scenarioId: any }>}
 */
export const createIssueScenarioFlow = async ({
  userId,
  issueId,
  targetModelName,
  targetModelId,
  scenarioName = "",
  paramOverrides = {},
}) => {
  const context = await getCreateScenarioContext({
    issueId,
    userId,
    targetModelId,
    targetModelName,
    paramOverrides,
  });

  const { matricesUsed, snapshotIdsUsed } = await resolveScenarioMatricesOrThrow({
    issueId: context.issue._id,
    issueEvaluationStructure: context.issueEvaluationStructure,
    alternatives: context.alternatives,
    criteria: context.criteria,
    participations: context.participations,
  });

  const { modelKey, results } = await executeScenarioModelOrThrow({
    targetModelName: context.targetModel.name,
    matricesUsed,
    normalizedParams: context.normalizedParams,
    criterionTypes: context.criterionTypes,
    consensusThresholdUsed: context.consensusThresholdUsed,
  });

  const { details, collectiveEvaluations } = buildScenarioOutputs({
    modelKey,
    results,
    alternatives: context.alternatives,
    criteria: context.criteria,
    participations: context.participations,
    matricesUsed,
  });

  const scenario = await IssueScenario.create({
    issue: context.issue._id,
    createdBy: userId,
    name: String(scenarioName || "").trim(),
    targetModel: context.targetModel._id,
    targetModelName: context.targetModel.name,
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
      consensusPhaseUsed: 1,
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
 * @returns {Promise<{ scenarios: Array<Record<string, any>> }>}
 */
export const getIssueScenariosPayload = async ({ issueId }) => {
  if (!issueId) {
    throw createBadRequestError("issueId is required");
  }

  const scenarioDocs = await IssueScenario.find({ issue: issueId })
    .sort({ createdAt: -1 })
    .select(
      "_id name targetModelName domainType evaluationStructure status createdAt createdBy"
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
 * @returns {Promise<{ scenario: Record<string, any> }>}
 */
export const getScenarioByIdPayload = async ({ scenarioId }) => {
  if (!scenarioId) {
    throw createBadRequestError("scenarioId is required");
  }

  const scenarioDoc = await IssueScenario.findById(scenarioId)
    .populate("createdBy", "email name")
    .lean();

  if (!scenarioDoc) {
    throw createNotFoundError("Scenario not found");
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
  if (!scenarioId) {
    throw createBadRequestError("scenarioId is required");
  }

  const scenario = await IssueScenario.findById(scenarioId);
  if (!scenario) {
    throw createNotFoundError("Scenario not found");
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