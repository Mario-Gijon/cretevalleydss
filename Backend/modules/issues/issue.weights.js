// Models
import { CriteriaWeightEvaluation } from "../../models/CriteriaWeightEvaluation.js";
import { Issue } from "../../models/Issues.js";
import { Participation } from "../../models/Participations.js";

// Modules
import { getWeightCompletionStats } from "./issue.queries.js";
import {
  ensureIssueOrdersDb,
  getOrderedLeafCriteriaDb,
} from "./issue.ordering.js";

// Utils
import {
  createBadRequestError,
  createForbiddenError,
  createNotFoundError,
} from "../../utils/common/errors.js";
import { sameId } from "../../utils/common/ids.js";

/**
 * Normaliza pesos cuando hay un único criterio hoja.
 *
 * @param {unknown} weightsMaybe Posible peso o estructura de pesos.
 * @returns {unknown[]}
 */
export const normalizeSingleWeight = (weightsMaybe) => {
  if (weightsMaybe == null) return [1];

  if (typeof weightsMaybe === "number") return [weightsMaybe];

  if (typeof weightsMaybe === "object" && !Array.isArray(weightsMaybe)) {
    return [weightsMaybe];
  }

  if (Array.isArray(weightsMaybe)) {
    const isTriangleArray =
      weightsMaybe.length === 3 &&
      weightsMaybe.every((item) => typeof item === "number" && Number.isFinite(item));

    if (isTriangleArray) return [weightsMaybe];

    const first = weightsMaybe[0];

    if (Array.isArray(first)) return [first];
    if (first && typeof first === "object") return [first];
    if (typeof first === "number") return [first];

    return [1];
  }

  return [1];
};

/**
 * Convierte un mapa de valores a enteros o null.
 *
 * @param {Record<string, any>} obj Objeto de entrada.
 * @returns {Record<string, number | null>}
 */
export const toNullableIntMap = (obj) =>
  Object.fromEntries(
    Object.entries(obj || {}).map(([key, value]) => [
      key,
      value === "" || value == null ? null : parseInt(value, 10),
    ])
  );

/**
 * Construye el objeto manualWeights ordenado canónicamente desde la entrada.
 *
 * @param {Record<string, any>} raw Pesos recibidos.
 * @param {Array<Record<string, any>>} leafDocs Criterios hoja ordenados.
 * @returns {Record<string, number | null>}
 */
export const buildOrderedManualWeights = (raw, leafDocs) =>
  Object.fromEntries(
    leafDocs.map((criterion) => {
      const value = raw?.[criterion.name];

      if (value === "" || value === null || value === undefined) {
        return [criterion.name, null];
      }

      const num = Number(value);
      return [criterion.name, Number.isFinite(num) ? num : null];
    })
  );

/**
 * Obtiene el payload raw de pesos manuales desde las variantes aceptadas.
 *
 * @param {Record<string, any>} body Cuerpo de la petición.
 * @returns {Record<string, any>}
 */
export const getRawManualWeightsPayload = (body) =>
  body?.manualWeights ||
  body?.weights?.manualWeights ||
  body?.weights ||
  body?.weigths?.manualWeights ||
  body?.weigths ||
  {};

/**
 * Construye el payload persistible de una evaluación BWM.
 *
 * @param {object} params Parámetros de entrada.
 * @param {import("mongoose").Types.ObjectId | string} params.issueId Id del issue.
 * @param {import("mongoose").Types.ObjectId | string} params.userId Id del experto.
 * @param {Record<string, any>} params.bwmData Datos BWM recibidos.
 * @param {boolean} [params.send=false] Indica si se marca como completado.
 * @returns {Record<string, any>}
 */
export const buildBwmEvaluationPayload = ({
  issueId,
  userId,
  bwmData,
  send = false,
}) => ({
  issue: issueId,
  expert: userId,
  bestCriterion: bwmData.bestCriterion,
  worstCriterion: bwmData.worstCriterion,
  bestToOthers: toNullableIntMap(bwmData.bestToOthers),
  othersToWorst: toNullableIntMap(bwmData.othersToWorst),
  completed: send,
  consensusPhase: 1,
});

/**
 * Marca los pesos del experto como completados en Participation.
 *
 * @param {object} params Parámetros de entrada.
 * @param {import("mongoose").Model<any>} params.ParticipationModel Modelo Participation.
 * @param {import("mongoose").Types.ObjectId | string} params.issueId Id del issue.
 * @param {import("mongoose").Types.ObjectId | string} params.userId Id del experto.
 * @returns {Promise<void>}
 */
export const markParticipationWeightsCompleted = async ({
  ParticipationModel,
  issueId,
  userId,
}) => {
  await ParticipationModel.updateOne(
    { issue: issueId, expert: userId },
    { $set: { weightsCompleted: true } }
  );
};

/**
 * Sincroniza el stage del issue a "weightsFinished" cuando todos los participantes
 * relevantes han terminado sus pesos.
 *
 * @param {Record<string, any>} issue Documento del issue.
 * @returns {Promise<{ totalParticipants: number, totalWeightsDone: number, stageChanged: boolean }>}
 */
export const syncIssueStageAfterWeightsCompletion = async (issue) => {
  const { totalParticipants, totalWeightsDone } = await getWeightCompletionStats(
    issue._id
  );

  let stageChanged = false;

  if (
    totalParticipants > 0 &&
    totalWeightsDone === totalParticipants &&
    issue.currentStage !== "weightsFinished"
  ) {
    issue.currentStage = "weightsFinished";
    await issue.save();
    stageChanged = true;
  }

  return {
    totalParticipants,
    totalWeightsDone,
    stageChanged,
  };
};

/**
 * Calcula los pesos manuales colectivos y los normaliza.
 *
 * Preserva la lógica actual:
 * - media por criterio
 * - si el total es 0, reparte uniformemente
 * - si no, normaliza para que sumen 1
 *
 * @param {object} params Parámetros de entrada.
 * @param {Array<Record<string, any>>} params.evaluations Evaluaciones manuales completadas.
 * @param {string[]} params.criterionNames Orden canónico de criterios.
 * @returns {number[]}
 */
export const computeNormalizedCollectiveManualWeights = ({
  evaluations,
  criterionNames,
}) => {
  const collectiveWeights = [];

  for (const criterionName of criterionNames) {
    const values = [];

    for (const evaluation of evaluations) {
      const value = evaluation.manualWeights?.[criterionName];
      if (value !== undefined && value !== null && value !== "") {
        values.push(Number(value));
      }
    }

    collectiveWeights.push(
      values.length
        ? values.reduce((acc, value) => acc + value, 0) / values.length
        : 0
    );
  }

  const total = collectiveWeights.reduce((acc, value) => acc + value, 0);

  if (total <= 0) {
    const uniformWeight = 1 / collectiveWeights.length;
    return collectiveWeights.map(() => uniformWeight);
  }

  return collectiveWeights.map((weight) => weight / total);
};

/**
 * Obtiene el contexto base para computar pesos colectivos.
 *
 * @param {object} params Parámetros de entrada.
 * @param {import("mongoose").Types.ObjectId | string} params.issueId Id del issue.
 * @param {import("mongoose").Types.ObjectId | string} params.userId Id del usuario actual.
 * @param {boolean} [params.requireConsensusMode=false] Indica si debe validarse el modo consensus.
 * @returns {Promise<Record<string, any>>}
 */
const getCollectiveWeightsContextOrThrow = async ({
  issueId,
  userId,
  requireConsensusMode = false,
}) => {
  const issue = await Issue.findById(issueId);

  if (!issue) {
    throw createNotFoundError("Issue not found");
  }

  if (!sameId(issue.admin, userId)) {
    throw createForbiddenError("Unauthorized: only admin can compute weights");
  }

  if (requireConsensusMode && issue.weightingMode !== "consensus") {
    throw createBadRequestError(
      "This issue is not using manual consensus weighting mode"
    );
  }

  await ensureIssueOrdersDb({ issueId: issue._id });

  return issue;
};

/**
 * Calcula pesos BWM colectivos y actualiza el issue.
 *
 * @param {object} params Parámetros de entrada.
 * @param {import("mongoose").Types.ObjectId | string} params.issueId Id del issue.
 * @param {import("mongoose").Types.ObjectId | string} params.userId Id del usuario actual.
 * @param {string} params.apiModelsBaseUrl Base URL del servicio de modelos.
 * @param {import("axios").AxiosStatic} params.httpClient Cliente HTTP.
 * @returns {Promise<{
 *   success: true,
 *   finished: true,
 *   msg: string,
 *   weights: unknown[],
 *   criteriaOrder: string[],
 * }>}
 */
export const computeBwmCollectiveWeightsFlow = async ({
  issueId,
  userId,
  apiModelsBaseUrl,
  httpClient,
}) => {
  const issue = await getCollectiveWeightsContextOrThrow({
    issueId,
    userId,
  });

  const pendingWeights = await Participation.find({
    issue: issue._id,
    invitationStatus: { $in: ["accepted", "pending"] },
    weightsCompleted: false,
  });

  if (pendingWeights.length > 0) {
    throw createBadRequestError(
      "Not all experts have completed their criteria weight evaluations"
    );
  }

  const criteria = await getOrderedLeafCriteriaDb({
    issueId: issue._id,
    issueDoc: issue,
    select: "_id name",
    lean: true,
  });

  const criterionNames = criteria.map((criterion) => criterion.name);

  const weightEvaluations = await CriteriaWeightEvaluation.find({
    issue: issue._id,
  }).populate("expert", "email");

  if (weightEvaluations.length === 0) {
    throw createBadRequestError("No BWM evaluations found for this issue");
  }

  const expertsData = {};

  for (const evaluation of weightEvaluations) {
    const {
      bestCriterion,
      worstCriterion,
      bestToOthers,
      othersToWorst,
    } = evaluation;

    if (!bestCriterion || !worstCriterion) continue;

    const mic = criterionNames.map(
      (criterionName) => Number(bestToOthers?.[criterionName]) || 1
    );

    const lic = criterionNames.map(
      (criterionName) => Number(othersToWorst?.[criterionName]) || 1
    );

    const expertEmail =
      evaluation.expert?.email || `expert_${evaluation.expert?._id}`;

    expertsData[expertEmail] = { mic, lic };
  }

  if (Object.keys(expertsData).length === 0) {
    throw createBadRequestError("Incomplete BWM data from experts");
  }

  const response = await httpClient.post(`${apiModelsBaseUrl}/bwm`, {
    experts_data: expertsData,
    eps_penalty: 1,
  });

  const { success, msg, results } = response.data || {};

  if (!success) {
    throw createBadRequestError(msg || "Model execution failed");
  }

  const weights = results?.weights || [];

  issue.modelParameters = {
    ...(issue.modelParameters || {}),
    weights: weights.slice(0, criterionNames.length),
  };

  issue.currentStage = "alternativeEvaluation";
  await issue.save();

  return {
    success: true,
    finished: true,
    msg: `Criteria weights for '${issue.name}' successfully computed.`,
    weights: issue.modelParameters.weights,
    criteriaOrder: criterionNames,
  };
};

/**
 * Calcula pesos manuales colectivos y actualiza el issue.
 *
 * @param {object} params Parámetros de entrada.
 * @param {import("mongoose").Types.ObjectId | string} params.issueId Id del issue.
 * @param {import("mongoose").Types.ObjectId | string} params.userId Id del usuario actual.
 * @returns {Promise<{
 *   success: true,
 *   finished: true,
 *   msg: string,
 *   weights: number[],
 *   criteriaOrder: string[],
 * }>}
 */
export const computeManualCollectiveWeightsFlow = async ({
  issueId,
  userId,
}) => {
  const issue = await getCollectiveWeightsContextOrThrow({
    issueId,
    userId,
    requireConsensusMode: true,
  });

  const participations = await Participation.find({
    issue: issue._id,
    invitationStatus: "accepted",
  });

  const weightsPending = participations.filter(
    (participation) => !participation.weightsCompleted
  );

  if (weightsPending.length > 0) {
    throw createBadRequestError(
      "Not all experts have completed their criteria weight evaluations"
    );
  }

  const criteria = await getOrderedLeafCriteriaDb({
    issueId: issue._id,
    issueDoc: issue,
    select: "_id name",
    lean: true,
  });

  const criterionNames = criteria.map((criterion) => criterion.name);

  const evaluations = await CriteriaWeightEvaluation.find({
    issue: issue._id,
    completed: true,
  });

  if (evaluations.length === 0) {
    throw createBadRequestError(
      "No manual weight evaluations found for this issue"
    );
  }

  const normalizedWeights = computeNormalizedCollectiveManualWeights({
    evaluations,
    criterionNames,
  });

  issue.modelParameters = {
    ...(issue.modelParameters || {}),
    weights: normalizedWeights,
  };

  issue.currentStage = "alternativeEvaluation";
  await issue.save();

  return {
    success: true,
    finished: true,
    msg: "Criteria weights computed",
    weights: issue.modelParameters.weights,
    criteriaOrder: criterionNames,
  };
};