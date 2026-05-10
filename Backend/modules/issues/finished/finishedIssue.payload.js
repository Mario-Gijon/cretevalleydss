import { Issue } from "../../../models/Issues.js";
import { IssueModel } from "../../../models/IssueModels.js";
import { IssueScenario } from "../../../models/IssueScenarios.js";
import { Participation } from "../../../models/Participations.js";
import {
  createAlternativesRankingsSection,
  createAnalyticalGraphsSection,
  createExpertsPairwiseRatingsSection,
  createExpertsRatingsSection,
  createSummarySection,
} from "./finishedIssue.sections.js";
import {
  ensureIssueOrdersDb,
  getOrderedLeafCriteriaDb,
} from "../issue.ordering.js";
import { detectIssueDomainTypeOrThrow } from "../expressionDomains/issueDomainDetection.js";
import {
  createBadRequestError,
  createInternalError,
  createNotFoundError,
} from "../../../utils/common/errors.js";
import { toIdString } from "../../../utils/common/ids.js";
import { isValidObjectIdLike } from "../../../utils/common/mongoose.js";
import {
  buildDefaultsResolved,
  mergeParamsResolved,
} from "../scenarios/scenario.params.js";
import {
  getConsensusRoundsForIssue,
  buildConsensusHistoryFromDocs,
} from "../consensus/index.js";
import {
  EVALUATION_STRUCTURES,
} from "../issue.evaluationStructure.js";

/**
 * Detecta el tipo de dominio del issue terminado.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string|Object} params.issueId Id del issue.
 * @param {Array<string|Object>} params.expertIds Ids de expertos aceptados.
 * @returns {Promise<string>}
 */
const detectFinishedIssueDomainType = async ({ issueId, expertIds }) => {
  const detected = await detectIssueDomainTypeOrThrow({
    issueId,
    expertIds,
  });

  return detected.domainType;
};

/**
 * Construye la lista de modelos compatibles para simulación desde un issue finalizado.
 *
 * @param {object} params Parámetros de entrada.
 * @param {Array<Object>} params.allModels Modelos disponibles.
 * @param {string} params.issueEvaluationStructure Estructura de evaluación del issue.
 * @param {number} params.leafCount Número de criterios hoja.
 * @param {string | null} params.domainType Tipo de dominio detectado.
 * @returns {Array<Object>}
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

    const modelEvaluationStructure = modelDoc.evaluationStructure;
    const sameEvaluationStructure =
      modelEvaluationStructure === issueEvaluationStructure;

    return {
      id: toIdString(modelDoc._id),
      name: modelDoc.name,
      isConsensus: modelDoc.isConsensus,
      evaluationStructure: modelEvaluationStructure,
      isMultiCriteria: modelDoc.isMultiCriteria,
      smallDescription: modelDoc.smallDescription,
      moreInfoUrl: modelDoc.moreInfoUrl,
      parameters: modelDoc.parameters,
      defaultsResolved,
      compatibility: {
        evaluationStructure: sameEvaluationStructure,
        domain: modelDoc.supportedDomains[domainType].enabled,
      },
    };
  });

/**
 * Construye la lista de escenarios disponibles para el detalle del issue.
 *
 * @param {object} params Parámetros de entrada.
 * @param {Array<Object>} params.scenarioDocs Escenarios guardados.
 * @returns {Array<Object>}
 */
const buildFinishedIssueScenariosPayload = ({ scenarioDocs }) =>
  scenarioDocs.map((scenario) => {
    return {
      id: toIdString(scenario._id),
      name: scenario.name,
      targetModelId: toIdString(scenario.targetModel),
      targetModelName: scenario.targetModelName,
      targetVersionLabel: scenario.targetVersionLabel,
      domainType: scenario.domainType,
      evaluationStructure: scenario.evaluationStructure,
      status: scenario.status,
      createdAt: scenario.createdAt,
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
 * @returns {Promise<Object>}
 */
export const getFinishedIssueInfoPayload = async ({ issueId }) => {
  if (!issueId || !isValidObjectIdLike(issueId)) {
    throw createBadRequestError("Valid issue id is required", {
      field: "issueId",
    });
  }

  const issue = await Issue.findById(issueId).populate("model").lean();

  if (!issue) {
    throw createNotFoundError("Issue not found", {
      field: "issueId",
    });
  }

  const issueEvaluationStructure = issue.evaluationStructure;

  const [
    summary,
    alternativesRankings,
    expertsRatings,
    analyticalGraphs,
    orderedIssue,
    participations,
    allModels,
    scenarioDocs,
    consensusDocs,
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
        "_id name targetModel targetModelName targetVersionLabel domainType evaluationStructure status createdAt createdBy"
      )
      .populate("createdBy", "email name")
      .lean(),
    getConsensusRoundsForIssue(issue._id),
  ]);

  if (!orderedIssue) {
    throw createInternalError("Ordered issue document is required", {
      field: "orderedIssue",
      details: {
        issueId: issue._id.toString(),
      },
    });
  }

  const latestConsensus = consensusDocs[consensusDocs.length - 1];
  if (!latestConsensus) {
    throw createInternalError("Finished issue requires consensus rounds", {
      field: "consensusDocs",
      details: {
        issueId: issue._id.toString(),
      },
    });
  }

  if (!latestConsensus.details.modelExecution) {
    throw createInternalError("Consensus modelExecution is required", {
      field: "consensus.details.modelExecution",
      details: {
        issueId: issue._id.toString(),
        phase: latestConsensus.phase,
      },
    });
  }

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
  if (!baseModel) {
    throw createInternalError("Finished issue model must be populated", {
      field: "model",
      details: {
        issueId: issue._id.toString(),
      },
    });
  }

  const baseDefaultsResolved = buildDefaultsResolved({
    modelDoc: baseModel,
    leafCount,
  });

  const baseParamsSaved = issue.modelParameters;
  const baseParamsResolved = mergeParamsResolved({
    defaultsResolved: baseDefaultsResolved,
    savedParams: baseParamsSaved,
  });

  const scenarios = buildFinishedIssueScenariosPayload({
    scenarioDocs,
  });

  const baseScenario = {
    id: null,
    name: `Base (${baseModel.name})`,
    targetModelId: toIdString(baseModel._id),
    targetModelName: baseModel.name,
    domainType,
    evaluationStructure: issueEvaluationStructure,
    status: "done",
    createdAt: latestConsensus.timestamp,
    createdBy: null,
    preview: latestConsensus.details.rankedAlternatives,
    outputs: {
      details: latestConsensus.details,
      collectiveEvaluations: latestConsensus.collectiveEvaluations,
      rawResults: latestConsensus.details.modelExecution.rawOutput,
    },
  };

  const consensusDetails = latestConsensus.details;
  const modelExecution = consensusDetails.modelExecution;
  const consensusRounds = buildConsensusHistoryFromDocs(consensusDocs);

  return {
    summary,
    alternativesRankings,
    expertsRatings,
    analyticalGraphs,
    consensusDetails,
    modelExecution,
    consensus: consensusDocs,
    consensusHistory: consensusRounds,
    consensusRounds,
    scenarios: [baseScenario, ...scenarios],
    modelParams: {
      leafCriteria,
      domainType,
      base: {
        modelId: toIdString(baseModel._id),
        modelName: baseModel.name,
        evaluationStructure: issueEvaluationStructure,
        parameters: baseModel.parameters,
        paramsSaved: baseParamsSaved,
        paramsResolved: baseParamsResolved,
      },
      availableModels,
    },
  };
};
