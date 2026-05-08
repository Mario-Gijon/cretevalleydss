         
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
import {
  normalizeScenarioParamOverridesOrThrow,
  resolveScenarioWeightsArray,
} from "./scenarios/scenario.params.js";
import { sameId, toIdString } from "../../utils/common/ids.js";
import { isValidObjectIdLike } from "../../utils/common/mongoose.js";
import { executeResolutionModelPipeline } from "./resolution/resolution.execution.js";
import { validateAndNormalizeModelParametersOrThrow } from "./modelParameters/index.js";
import axios from "axios";

const normalizeNonEmptyString = (value) => {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

/**
 * @typedef {Object} IssueScenarioCreateResult
 * @property {*} scenarioId Id del escenario creado.
 */


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

const resolveCriteriaWeightsKind = (modelDoc) => {
  const parameters = Array.isArray(modelDoc?.parameters) ? modelDoc.parameters : [];
  const weightsParameter = parameters.find(
    (parameter) => normalizeNonEmptyString(parameter?.semanticRole) === "criteriaWeights"
  );

  const weightsType = normalizeNonEmptyString(weightsParameter?.type);
  if (weightsType === "fuzzyArray") {
    return "fuzzy";
  }

  if (weightsType === "array") {
    return "crisp";
  }

  return null;
};

const validateScenarioModelCompatibilityOrThrow = ({
  issue,
  targetModel,
  targetRuntimeSnapshot,
}) => {
  const issueEvaluationStructure = normalizeNonEmptyString(issue?.evaluationStructure);
  const issueInputKind = normalizeNonEmptyString(issue?.inputKind);
  const targetEvaluationStructure =
    targetRuntimeSnapshot?.targetEvaluationStructure ?? null;
  const targetInputKind = targetRuntimeSnapshot?.targetInputKind ?? null;

  if (targetEvaluationStructure !== issueEvaluationStructure) {
    throw createBadRequestError(
      "Incompatible models: evaluation structure does not match this issue input type.",
      {
        field: "targetModel",
      }
    );
  }

  if (targetInputKind !== issueInputKind) {
    throw createBadRequestError(
      "Incompatible models: target model input kind does not match this issue input kind.",
      {
        field: "targetModel",
      }
    );
  }

  const sourceWeightsKind = resolveCriteriaWeightsKind(issue?.model);
  const targetWeightsKind = resolveCriteriaWeightsKind(targetModel);
  if (
    sourceWeightsKind &&
    targetWeightsKind &&
    sourceWeightsKind !== targetWeightsKind
  ) {
    throw createBadRequestError(
      "Incompatible models: target model criteria weights kind does not match this issue model.",
      {
        field: "targetModel",
      }
    );
  }
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
  validateScenarioModelCompatibilityOrThrow({
    issue,
    targetModel,
    targetRuntimeSnapshot,
  });

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

  const {
    matricesUsed,
    snapshotIdsUsed,
    results,
    collectiveEvaluations,
    consensusDetails,
    consensusLevel,
  } = await executeResolutionModelPipeline({
    issue: {
      isConsensus: context.targetRuntimeModel?.outputKind === "consensusRanking",
      consensusThreshold: context.consensusThresholdUsed,
    },
    issueId: context.issue._id,
    model: context.targetRuntimeModel,
    evaluationStructure: context.issueEvaluationStructure,
    alternatives: context.alternatives,
    criteria: context.criteria,
    participations: context.participations,
    currentPhase: context.evaluationPhase,
    modelParameters: context.normalizedParams,
    apiModelsBaseUrl: process.env.ORIGIN_APIMODELS || "http://localhost:7000",
    httpClient: axios,
    requireCompleteMatrices: true,
    incompleteMatricesMessage:
      context.issueEvaluationStructure === EVALUATION_STRUCTURES.DIRECT
        ? "Simulation requires complete evaluations (some values are still null)."
        : "Simulation requires complete pairwise evaluations (some values are still null).",
    requestErrorMessage: "Error creating scenario",
  });

  const details = {
    ...consensusDetails,
    ...(consensusLevel != null ? { level: consensusLevel } : {}),
  };
  if (details?.modelExecution?.apiModelKey != null) {
    details.modelExecution.modelKey = details.modelExecution.apiModelKey;
  }
  const criterionTypes =
    context.issueEvaluationStructure === EVALUATION_STRUCTURES.PAIRWISE_ALTERNATIVES
      ? []
      : context.criteria.map((criterion) =>
          criterion.type === "benefit" ? "max" : "min"
        );

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
      criterionTypes,
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
