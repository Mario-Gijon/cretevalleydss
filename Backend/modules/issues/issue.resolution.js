// modules/issues/issue.resolution.js

// Models
import { Consensus } from "../../models/Consensus.js";
import { Evaluation } from "../../models/Evaluations.js";
import { Issue } from "../../models/Issues.js";
import { IssueModel } from "../../models/IssueModels.js";
import { Participation } from "../../models/Participations.js";

// Modules
import {
  EVALUATION_STRUCTURES,
  resolveEvaluationStructure,
} from "./issue.evaluationStructure.js";
import { getNextConsensusPhase } from "./issue.queries.js";
import {
  buildScenarioDirectMatrices,
  buildScenarioPairwiseMatrices,
} from "./issue.scenarios.js";

// Utils
import {
  ensureIssueOrdersDb,
  getOrderedAlternativesDb,
  getOrderedLeafCriteriaDb,
} from "../../modules/issues/issue.ordering.js";
import { normalizeParams } from "../../services/modelApi/modelParamNormalizer.js";
import { getModelEndpointKey } from "../../services/modelApi/modelCatalog.js";
import {
  createBadRequestError,
  createForbiddenError,
  createInternalError,
  createNotFoundError,
} from "../../utils/common/errors.js";
import { sameId } from "../../utils/common/ids.js";

/**
 * Resuelve la clave del endpoint del servicio de modelos para un nombre de modelo.
 *
 * @param {string} modelName Nombre del modelo.
 * @returns {string | null}
 */
const resolveModelEndpointKey = (modelName) => {
  const sharedResolver = getModelEndpointKey(modelName);
  if (sharedResolver) {
    return sharedResolver;
  }

  switch (String(modelName || "").trim().toUpperCase()) {
    case "TOPSIS":
      return "topsis";
    case "FUZZY TOPSIS":
      return "fuzzy_topsis";
    case "BORDA":
      return "borda";
    case "ARAS":
      return "aras";
    case "HERRERA-VIEDMA CRP":
      return "herrera_viedma_crp";
    default:
      return null;
  }
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
 * Convierte los expert_points de plots_graphic a un mapa indexado por email.
 *
 * @param {Array<Object>} participations Participaciones aceptadas.
 * @param {Object | null | undefined} plotsGraphic Gráfico bruto del modelo.
 * @returns {Object | null}
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
    throw createNotFoundError("Issue not found");
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
 * @returns {Object}
 */
const buildDirectResolutionArtifacts = ({
  results,
  alternatives,
  criteria,
  matrices,
  participations,
  issue,
}) => {
  const alternativeNames = alternatives.map((alternative) => alternative.name);

  const rankedAlternatives = (results.collective_ranking || []).map(
    (index) => alternativeNames[index]
  );

  const rankedWithScores = (results.collective_ranking || []).map((index) => ({
    name: alternativeNames[index],
    score: results.collective_scores?.[index] ?? null,
  }));

  const collectiveScoresByName = {};
  (results.collective_scores || []).forEach((score, index) => {
    collectiveScoresByName[alternativeNames[index]] = score;
  });

  const collectiveEvaluations = {};
  (results.collective_matrix || []).forEach((row, alternativeIndex) => {
    const alternativeName = alternativeNames[alternativeIndex];
    collectiveEvaluations[alternativeName] = {};

    row.forEach((value, criterionIndex) => {
      const criterionName = criteria[criterionIndex]?.name;
      if (!criterionName) return;
      collectiveEvaluations[alternativeName][criterionName] = { value };
    });
  });

  const plotsGraphicWithEmails = buildPlotsGraphicWithEmails(
    participations,
    results?.plots_graphic
  );

  return {
    rankedAlternatives,
    rankedWithScores,
    collectiveEvaluations,
    consensusDetails: {
      rankedAlternatives: rankedWithScores,
      matrices,
      collective_scores: collectiveScoresByName,
      collective_ranking: rankedAlternatives,
      ...(plotsGraphicWithEmails
        ? { plotsGraphic: plotsGraphicWithEmails }
        : {}),
    },
    consensusLevel: issue.isConsensus ? results.cm ?? 0 : null,
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
 * @returns {Object}
 */
const buildPairwiseResolutionArtifacts = ({
  results,
  alternatives,
  criteria,
  matrices,
  participations,
}) => {
  const alternativeNames = alternatives.map((alternative) => alternative.name);

  const rankedWithScores = (results.alternatives_rankings || []).map((index) => ({
    name: alternativeNames[index],
    score: results.collective_scores?.[index] ?? null,
  }));

  const plotsGraphicWithEmails = buildPlotsGraphicWithEmails(
    participations,
    results?.plots_graphic
  );

  const transformedCollectiveEvaluations = {};

  for (const criterion of criteria) {
    const matrix = results.collective_evaluations?.[criterion.name];
    if (!matrix) continue;

    transformedCollectiveEvaluations[criterion.name] = matrix.map(
      (row, rowIndex) => {
        const formattedRow = { id: alternatives[rowIndex]?.name };

        row.forEach((value, colIndex) => {
          formattedRow[alternatives[colIndex]?.name] = value;
        });

        return formattedRow;
      }
    );
  }

  return {
    rankedWithScores,
    collectiveEvaluations: transformedCollectiveEvaluations,
    consensusDetails: {
      rankedAlternatives: rankedWithScores,
      matrices,
      collective_scores: Object.fromEntries(
        alternativeNames.map((name, index) => [
          name,
          results.collective_scores?.[index] ?? null,
        ])
      ),
      collective_ranking: rankedWithScores.map((item) => item.name),
      ...(plotsGraphicWithEmails
        ? { plotsGraphic: plotsGraphicWithEmails }
        : {}),
    },
    consensusLevel: results.cm ?? 0,
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

  const modelKey = resolveModelEndpointKey(model.name);
  if (!modelKey) {
    throw createBadRequestError(
      `No API endpoint defined for model ${model.name}`
    );
  }

  const criterionTypes = buildCriterionTypes(criteria);
  const normalizedModelParams = normalizeParams(issue.modelParameters);

  const response = await httpClient.post(
    `${apiModelsBaseUrl}/${modelKey}`,
    {
      matrices,
      modelParameters: normalizedModelParams,
      criterionTypes,
    },
    {
      headers: { "Content-Type": "application/json" },
    }
  );

  const { success, msg, results } = response.data || {};
  if (!success) {
    throw createBadRequestError(msg || "Model execution failed");
  }

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
        success: true,
        finished: true,
        msg: `Issue '${issue.name}' resolved as final round due to closure date.`,
        rankedAlternatives,
      };
    }

    if (issue.consensusMaxPhases && currentPhase >= issue.consensusMaxPhases) {
      issue.active = false;
      await issue.save();

      return {
        success: true,
        finished: true,
        msg: `Issue '${issue.name}' resolved: maximum number of consensus rounds reached.`,
        rankedAlternatives,
      };
    }

    if (results.cm && results.cm >= issue.consensusThreshold) {
      issue.active = false;
      await issue.save();

      return {
        success: true,
        finished: true,
        msg: `Issue '${issue.name}' resolved: consensus threshold ${issue.consensusThreshold} reached.`,
        rankedAlternatives,
      };
    }

    await Participation.updateMany(
      { issue: issue._id },
      { $set: { evaluationCompleted: false } }
    );

    return {
      success: true,
      finished: false,
      msg: `Issue '${issue.name}' consensus threshold not reached. Another round is needed.`,
    };
  }

  issue.active = false;
  issue.currentStage = "finished";
  await issue.save();

  return {
    success: true,
    finished: true,
    msg: `Issue '${issue.name}' resolved.`,
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

  const modelKey = resolveModelEndpointKey(model.name);
  if (!modelKey) {
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

  const response = await httpClient.post(
    `${apiModelsBaseUrl}/${modelKey}`,
    {
      matrices,
      consensusThreshold: issue.consensusThreshold,
      modelParameters: normalizedModelParams,
    },
    {
      headers: { "Content-Type": "application/json" },
    }
  );

  const { success, msg, results } = response.data || {};
  if (!success) {
    throw createBadRequestError(msg || "Model execution failed");
  }

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
      success: true,
      finished: true,
      msg: `Issue '${issue.name}' resolved as final round due to closure date.`,
      rankedAlternatives: rankedWithScores,
    };
  }

  if (issue.consensusMaxPhases && currentPhase >= issue.consensusMaxPhases) {
    issue.active = false;
    await issue.save();

    return {
      success: true,
      finished: true,
      msg: `Issue '${issue.name}' resolved: maximum number of consensus rounds reached.`,
      rankedAlternatives: rankedWithScores,
    };
  }

  if (consensusLevel >= issue.consensusThreshold) {
    issue.active = false;
    issue.currentStage = "finished";
    await issue.save();

    return {
      success: true,
      finished: true,
      msg: `Issue '${issue.name}' resolved: consensus threshold ${issue.consensusThreshold} reached.`,
      rankedAlternatives: rankedWithScores,
    };
  }

  await Participation.updateMany(
    { issue: issue._id },
    { $set: { evaluationCompleted: false } }
  );

  return {
    success: true,
    finished: false,
    msg: `Issue '${issue.name}' conensus threshold not reached. Another round is needed.`,
  };
};