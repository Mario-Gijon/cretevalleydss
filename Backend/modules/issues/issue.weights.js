// Modules
import { getWeightCompletionStats } from "./issue.queries.js";

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