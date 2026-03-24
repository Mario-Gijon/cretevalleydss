// Models
import { Consensus } from "../../models/Consensus.js";
import { Issue } from "../../models/Issues.js";
import { IssueModel } from "../../models/IssueModels.js";
import { IssueScenario } from "../../models/IssueScenarios.js";
import { Participation } from "../../models/Participations.js";

// Utils
import {
  createAlternativesRankingsSection,
  createAnalyticalGraphsSection,
  createExpertsPairwiseRatingsSection,
  createExpertsRatingsSection,
  createSummarySection,
} from "../../modules/issues/issue.finishedSections.js";
import { ensureIssueOrdersDb, getOrderedLeafCriteriaDb } from "../../modules/issues/issue.ordering.js";
import { detectIssueDomainTypeOrThrow } from "./issue.scenarios.js";
import { createNotFoundError } from "../../utils/common/errors.js";
import { toIdString } from "../../utils/common/ids.js";

// Modules
import {
  buildDefaultsResolved,
  mergeParamsResolved,
} from "./issue.scenarios.js";
import {
  EVALUATION_STRUCTURES,
  resolveEvaluationStructure,
} from "./issue.evaluationStructure.js";

/**
 * Detecta el tipo de dominio del issue terminado.
 *
 * Si no puede detectarse de forma fiable, devuelve null para no romper
 * la vista de detalle.
 *
 * @param {object} params Parámetros de entrada.
 * @param {import("mongoose").Types.ObjectId | string} params.issueId Id del issue.
 * @param {Array<import("mongoose").Types.ObjectId | string>} params.expertIds Ids de expertos aceptados.
 * @returns {Promise<string | null>}
 */
const detectFinishedIssueDomainType = async ({ issueId, expertIds }) => {
  try {
    const detected = await detectIssueDomainTypeOrThrow({
      issueId,
      expertIds,
    });

    return detected.domainType;
  } catch (error) {
    return null;
  }
};

/**
 * Construye la lista de modelos compatibles para simulación desde un issue finalizado.
 *
 * @param {object} params Parámetros de entrada.
 * @param {Array<Record<string, any>>} params.allModels Modelos disponibles.
 * @param {string} params.issueEvaluationStructure Estructura de evaluación del issue.
 * @param {number} params.leafCount Número de criterios hoja.
 * @param {string | null} params.domainType Tipo de dominio detectado.
 * @returns {Array<Record<string, any>>}
 */
const buildAvailableModelsPayload = ({
  allModels,
  issueEvaluationStructure,
  leafCount,
  domainType,
}) =>
  allModels.map((modelDoc) => {
    const defaultsResolved = buildDefaultsResolved({
      modelDoc,
      leafCount,
    });

    const modelEvaluationStructure = resolveEvaluationStructure(modelDoc);
    const sameEvaluationStructure =
      modelEvaluationStructure === issueEvaluationStructure;

    return {
      id: toIdString(modelDoc._id),
      name: modelDoc.name,
      isConsensus: Boolean(modelDoc.isConsensus),
      evaluationStructure: modelEvaluationStructure,
      isPairwise:
        modelEvaluationStructure ===
        EVALUATION_STRUCTURES.PAIRWISE_ALTERNATIVES,
      isMultiCriteria: Boolean(modelDoc.isMultiCriteria),
      smallDescription: modelDoc.smallDescription,
      moreInfoUrl: modelDoc.moreInfoUrl,
      parameters: modelDoc.parameters || [],
      defaultsResolved,
      compatibility: {
        evaluationStructure: sameEvaluationStructure,
        pairwise: sameEvaluationStructure,
        domain: domainType
          ? Boolean(modelDoc.supportedDomains?.[domainType]?.enabled)
          : true,
      },
    };
  });

/**
 * Construye la lista de escenarios disponibles para el detalle del issue.
 *
 * @param {object} params Parámetros de entrada.
 * @param {Array<Record<string, any>>} params.scenarioDocs Escenarios guardados.
 * @returns {Array<Record<string, any>>}
 */
const buildFinishedIssueScenariosPayload = ({ scenarioDocs }) =>
  (scenarioDocs || []).map((scenario) => {
    const scenarioEvaluationStructure = resolveEvaluationStructure(scenario);

    return {
      id: toIdString(scenario._id),
      name: scenario.name || "",
      targetModelId: scenario.targetModel
        ? toIdString(scenario.targetModel)
        : null,
      targetModelName: scenario.targetModelName || "",
      domainType: scenario.domainType ?? null,
      evaluationStructure: scenarioEvaluationStructure,
      isPairwise:
        scenarioEvaluationStructure ===
        EVALUATION_STRUCTURES.PAIRWISE_ALTERNATIVES,
      status: scenario.status || "done",
      createdAt: scenario.createdAt || null,
      createdBy: scenario.createdBy
        ? {
            email: scenario.createdBy.email,
            name: scenario.createdBy.name,
          }
        : null,
    };
  });

/**
 * Construye el payload completo de detalle para un issue finalizado.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string} params.issueId Id del issue.
 * @returns {Promise<Record<string, any>>}
 */
export const getFinishedIssueInfoPayload = async ({ issueId }) => {
  const issue = await Issue.findById(issueId).populate("model").lean();

  if (!issue) {
    throw createNotFoundError("Issue not found");
  }

  const issueEvaluationStructure =
    issue.evaluationStructure || resolveEvaluationStructure(issue.model);

  const [
    summary,
    alternativesRankings,
    expertsRatings,
    analyticalGraphs,
    orderedIssue,
    participations,
    allModels,
    scenarioDocs,
    latestConsensus,
  ] = await Promise.all([
    createSummarySection(issue._id),
    createAlternativesRankingsSection(issue._id),
    issueEvaluationStructure === EVALUATION_STRUCTURES.PAIRWISE_ALTERNATIVES
      ? createExpertsPairwiseRatingsSection(issue._id)
      : createExpertsRatingsSection(issue._id),
    createAnalyticalGraphsSection(issue._id, issue.isConsensus),
    ensureIssueOrdersDb({ issueId: issue._id }),
    Participation.find({
      issue: issue._id,
      invitationStatus: "accepted",
    })
      .select("expert")
      .lean(),
    IssueModel.find()
      .select(
        "name isConsensus evaluationStructure isMultiCriteria smallDescription extendDescription moreInfoUrl parameters supportedDomains"
      )
      .lean(),
    IssueScenario.find({ issue: issue._id })
      .sort({ createdAt: -1 })
      .select(
        "_id name targetModel targetModelName domainType evaluationStructure status createdAt createdBy"
      )
      .populate("createdBy", "email name")
      .lean(),
    Consensus.findOne({ issue: issue._id }).sort({ phase: -1 }).lean(),
  ]);

  const leafDocs = await getOrderedLeafCriteriaDb({
    issueId: issue._id,
    issueDoc: orderedIssue,
    select: "_id name type",
    lean: true,
  });

  const leafCount = leafDocs.length;

  const leafCriteria = leafDocs.map((criterion) => ({
    id: toIdString(criterion._id),
    name: criterion.name,
    type: criterion.type,
  }));

  const expertIds = participations.map((participation) => participation.expert);

  const domainType = await detectFinishedIssueDomainType({
    issueId: issue._id,
    expertIds,
  });

  const availableModels = buildAvailableModelsPayload({
    allModels,
    issueEvaluationStructure,
    leafCount,
    domainType,
  });

  const baseModel = issue.model;
  const baseDefaultsResolved = buildDefaultsResolved({
    modelDoc: baseModel,
    leafCount,
  });

  const baseParamsSaved = issue.modelParameters || {};
  const baseParamsResolved = mergeParamsResolved({
    defaultsResolved: baseDefaultsResolved,
    savedParams: baseParamsSaved,
  });

  const scenarios = buildFinishedIssueScenariosPayload({
    scenarioDocs,
  });

  const baseScenario = {
    id: null,
    name: `Base (${baseModel?.name || "Model"})`,
    targetModelId: toIdString(baseModel?._id),
    targetModelName: baseModel?.name || "",
    domainType,
    evaluationStructure: issueEvaluationStructure,
    isPairwise:
      issueEvaluationStructure ===
      EVALUATION_STRUCTURES.PAIRWISE_ALTERNATIVES,
    status: "done",
    createdAt: latestConsensus?.timestamp || null,
    createdBy: null,
    preview: latestConsensus?.details?.rankedAlternatives || null,
  };

  return {
    summary,
    alternativesRankings,
    expertsRatings,
    analyticalGraphs,
    scenarios: [baseScenario, ...scenarios],
    modelParams: {
      leafCriteria,
      domainType,
      base: {
        modelId: toIdString(baseModel?._id),
        modelName: baseModel?.name,
        evaluationStructure: issueEvaluationStructure,
        parameters: baseModel?.parameters || [],
        paramsSaved: baseParamsSaved,
        paramsResolved: baseParamsResolved,
      },
      availableModels,
    },
  };
};