import { Participation } from "../../../models/Participations.js";

import {
  getAcceptedParticipation,
  getWeightCompletionStats,
} from "../issue.queries.js";
import {
  ensureIssueOrdersDb,
  getOrderedLeafCriteriaDb,
} from "../issue.ordering.js";

import {
  createBadRequestError,
  createForbiddenError,
} from "../../../utils/common/errors.js";
import { sameId } from "../../../utils/common/ids.js";

/**
 * @typedef {Object} WeightStageSyncResult
 * @property {number} totalParticipants Participantes relevantes.
 * @property {number} totalWeightsDone Participantes con pesos completados.
 * @property {boolean} stageChanged Indica si cambió el stage del issue.
 */

/**
 * @typedef {Object} WeightContextResult
 * @property {Object} issue Documento del issue.
 * @property {string} issueId Id normalizado del issue.
 * @property {Object} participation Participación aceptada del usuario actual.
 * @property {Array<Object>} leafDocs Criterios hoja ordenados.
 * @property {string[]} criterionNames Nombres de criterios hoja en orden canónico.
 */

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
 * @param {Object} obj Objeto de entrada.
 * @returns {Object}
 */
export const toNullableIntMap = (obj) =>
  Object.fromEntries(
    Object.entries(obj || {}).map(([key, value]) => [
      key,
      value === "" || value == null ? null : parseInt(value, 10),
    ])
  );

/**
 * Obtiene el contexto base de pesos para un experto dentro de un issue.
 *
 * Valida:
 * - id de issue válido
 * - que el usuario siga siendo participante aceptado
 * - orden canónico de criterios hoja
 *
 * @param {object} params Parámetros de entrada.
 * @param {Object} params.issue Issue cargado.
 * @param {string|Object} params.userId Id del usuario actual.
 * @returns {Promise<WeightContextResult>}
 */
export const getWeightEvaluationContextOrThrow = async ({
  issue,
  userId,
}) => {
  const issueDoc = issue;
  const issueId = issueDoc?._id;

  if (!issueId) {
    throw createBadRequestError("Issue id is required");
  }

  const participation = await getAcceptedParticipation(issueId, userId);
  if (!participation) {
    throw createForbiddenError("You are no longer a participant in this issue");
  }

  await ensureIssueOrdersDb({ issueId });

  const leafDocs = await getOrderedLeafCriteriaDb({
    issueId,
    issueDoc,
    select: "_id name",
    lean: true,
  });

  return {
    issue: issueDoc,
    issueId,
    participation,
    leafDocs,
    criterionNames: leafDocs.map((criterion) => criterion.name),
  };
};

/**
 * Marca los pesos del experto como completados en Participation.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string|Object} params.issueId Id del issue.
 * @param {string|Object} params.userId Id del experto.
 * @returns {Promise<void>}
 */
export const markParticipationWeightsCompleted = async ({
  issueId,
  userId,
}) => {
  await Participation.updateOne(
    { issue: issueId, expert: userId },
    { $set: { weightsCompleted: true } }
  );
};

/**
 * Sincroniza el stage del issue a "weightsFinished" cuando todos los participantes
 * relevantes han terminado sus pesos.
 *
 * @param {Object} issue Documento del issue.
 * @returns {Promise<WeightStageSyncResult>}
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
 * Obtiene el contexto base para computar pesos colectivos.
 *
 * @param {object} params Parámetros de entrada.
 * @param {Object} params.issue Issue cargado.
 * @param {string|Object} params.userId Id del usuario actual.
 * @param {boolean} [params.requireConsensusMode=false] Indica si debe validarse el modo consensus.
 * @returns {Promise<Object>}
 */
export const getCollectiveWeightsContextOrThrow = async ({
  issue,
  userId,
  requireConsensusMode = false,
}) => {
  const issueDoc = issue;
  const issueId = issueDoc?._id;

  if (!issueId) {
    throw createBadRequestError("Issue id is required");
  }

  if (!sameId(issueDoc.admin, userId)) {
    throw createForbiddenError("Unauthorized: only admin can compute weights");
  }

  if (requireConsensusMode && issueDoc.weightingMode !== "consensus") {
    throw createBadRequestError(
      "This issue is not using manual consensus weighting mode"
    );
  }

  await ensureIssueOrdersDb({ issueId });

  return issueDoc;
};
