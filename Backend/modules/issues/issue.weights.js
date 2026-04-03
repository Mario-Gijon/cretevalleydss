// Models
import { CriteriaWeightEvaluation } from "../../models/CriteriaWeightEvaluation.js";
import { Issue } from "../../models/Issues.js";
import { Participation } from "../../models/Participations.js";

// Modules
import {
  getAcceptedParticipation,
  getWeightCompletionStats,
} from "./issue.queries.js";
import {
  ensureIssueOrdersDb,
  getOrderedLeafCriteriaDb,
} from "./issue.ordering.js";
import { validateFinalWeights } from "./issue.validation.js";

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

const MANUAL_WEIGHTS_SUM_TOLERANCE = 0.001;

/**
 * Obtiene el contexto base de pesos manuales para un experto dentro de un issue.
 *
 * Valida:
 * - existencia del issue
 * - que el usuario siga siendo participante aceptado
 * - orden canónico de criterios hoja
 *
 * @param {object} params Parámetros de entrada.
 * @param {import("mongoose").Types.ObjectId | string} params.issueId Id del issue.
 * @param {import("mongoose").Types.ObjectId | string} params.userId Id del usuario actual.
 * @returns {Promise<{
 *   issue: Record<string, any>,
 *   participation: Record<string, any>,
 *   leafDocs: Array<Record<string, any>>,
 *   criterionNames: string[],
 * }>}
 */
const getManualWeightsContextOrThrow = async ({ issueId, userId }) => {
  if (!issueId) {
    throw createBadRequestError("Issue id is required");
  }

  const issue = await Issue.findById(issueId);
  if (!issue) {
    throw createNotFoundError("Issue not found");
  }

  const participation = await getAcceptedParticipation(issue._id, userId);
  if (!participation) {
    throw createForbiddenError("You are no longer a participant");
  }

  await ensureIssueOrdersDb({ issueId: issue._id });

  const leafDocs = await getOrderedLeafCriteriaDb({
    issueId: issue._id,
    issueDoc: issue,
    select: "_id name",
    lean: true,
  });

  return {
    issue,
    participation,
    leafDocs,
    criterionNames: leafDocs.map((criterion) => criterion.name),
  };
};

/**
 * Convierte unos pesos manuales persistidos al formato esperado por el frontend.
 *
 * Mantiene todas las claves en el orden canónico de criterios y reemplaza
 * null/undefined por string vacío para no romper los inputs del formulario.
 *
 * @param {object} params Parámetros de entrada.
 * @param {Record<string, any>} [params.manualWeights={}] Pesos persistidos.
 * @param {string[]} params.criterionNames Nombres de criterios hoja en orden canónico.
 * @returns {Record<string, string | number>}
 */
const buildManualWeightsResponse = ({
  manualWeights = {},
  criterionNames,
}) =>
  criterionNames.reduce((accumulator, criterionName) => {
    const value = manualWeights?.[criterionName];

    accumulator[criterionName] =
      value === null || value === undefined ? "" : value;

    return accumulator;
  }, {});

/**
 * Valida que los pesos manuales enviados estén completos y normalizados.
 *
 * Reglas preservadas:
 * - todos los criterios deben tener valor
 * - cada valor debe estar entre 0 y 1
 * - la suma total debe ser 1 con una tolerancia mínima
 *
 * @param {object} params Parámetros de entrada.
 * @param {Record<string, number | null>} params.manualWeights Pesos manuales ordenados.
 * @param {string[]} params.criterionNames Nombres de criterios hoja en orden canónico.
 * @returns {void}
 */
const validateSubmittedManualWeightsOrThrow = ({
  manualWeights,
  criterionNames,
}) => {
  const missing = criterionNames.filter(
    (criterionName) => manualWeights[criterionName] == null
  );

  if (missing.length > 0) {
    throw createBadRequestError("All criteria must have a weight");
  }

  const invalid = criterionNames.find((criterionName) => {
    const value = manualWeights[criterionName];

    return (
      typeof value !== "number" ||
      !Number.isFinite(value) ||
      value < 0 ||
      value > 1
    );
  });

  if (invalid) {
    throw createBadRequestError(
      `Weight for '${invalid}' must be between 0 and 1`
    );
  }

  const sum = criterionNames.reduce(
    (accumulator, criterionName) =>
      accumulator + Number(manualWeights[criterionName]),
    0
  );

  if (Math.abs(sum - 1) > MANUAL_WEIGHTS_SUM_TOLERANCE) {
    throw createBadRequestError(
      `Manual weights must sum to 1. Current sum: ${sum}`
    );
  }
};

/**
 * Guarda una evaluación de pesos manuales para un experto.
 *
 * @param {object} params Parámetros de entrada.
 * @param {import("mongoose").Types.ObjectId | string} params.issueId Id del issue.
 * @param {import("mongoose").Types.ObjectId | string} params.userId Id del experto.
 * @param {Record<string, number | null>} params.manualWeights Pesos manuales ordenados.
 * @param {boolean} params.completed Indica si la evaluación queda enviada.
 * @returns {Promise<void>}
 */
const upsertManualWeightsEvaluation = async ({
  issueId,
  userId,
  manualWeights,
  completed,
}) => {
  await CriteriaWeightEvaluation.updateOne(
    { issue: issueId, expert: userId },
    {
      $set: {
        issue: issueId,
        expert: userId,
        manualWeights,
        completed,
        consensusPhase: 1,
      },
    },
    { upsert: true }
  );
};

/**
 * Obtiene los pesos manuales guardados del experto actual.
 *
 * @param {object} params Parámetros de entrada.
 * @param {import("mongoose").Types.ObjectId | string} params.issueId Id del issue.
 * @param {import("mongoose").Types.ObjectId | string} params.userId Id del experto.
 * @returns {Promise<{
 *   success: true,
 *   manualWeights: Record<string, string | number>,
 * }>}
 */
export const getManualWeightsPayload = async ({ issueId, userId }) => {
  const { issue, criterionNames } = await getManualWeightsContextOrThrow({
    issueId,
    userId,
  });

  const evaluation = await CriteriaWeightEvaluation.findOne({
    issue: issue._id,
    expert: userId,
  }).lean();

  return {
    success: true,
    manualWeights: buildManualWeightsResponse({
      manualWeights: evaluation?.manualWeights || {},
      criterionNames,
    }),
  };
};

/**
 * Guarda un borrador de pesos manuales para el experto actual.
 *
 * @param {object} params Parámetros de entrada.
 * @param {import("mongoose").Types.ObjectId | string} params.issueId Id del issue.
 * @param {import("mongoose").Types.ObjectId | string} params.userId Id del experto.
 * @param {Record<string, any>} params.body Cuerpo recibido en la request.
 * @returns {Promise<{ success: true, msg: string }>}
 */
export const saveManualWeightsDraftFlow = async ({
  issueId,
  userId,
  body,
}) => {
  const { issue, leafDocs } = await getManualWeightsContextOrThrow({
    issueId,
    userId,
  });

  const raw = getRawManualWeightsPayload(body);
  const manualWeights = buildOrderedManualWeights(raw, leafDocs);

  await upsertManualWeightsEvaluation({
    issueId: issue._id,
    userId,
    manualWeights,
    completed: false,
  });

  return {
    success: true,
    msg: "Manual weights saved successfully",
  };
};

/**
 * Valida y envía los pesos manuales del experto actual.
 *
 * @param {object} params Parámetros de entrada.
 * @param {import("mongoose").Types.ObjectId | string} params.issueId Id del issue.
 * @param {import("mongoose").Types.ObjectId | string} params.userId Id del experto.
 * @param {Record<string, any>} params.body Cuerpo recibido en la request.
 * @returns {Promise<{ success: true, msg: string }>}
 */
export const submitManualWeightsFlow = async ({
  issueId,
  userId,
  body,
}) => {
  const { issue, leafDocs, criterionNames } =
    await getManualWeightsContextOrThrow({
      issueId,
      userId,
    });

  const raw = getRawManualWeightsPayload(body);
  const manualWeights = buildOrderedManualWeights(raw, leafDocs);

  validateSubmittedManualWeightsOrThrow({
    manualWeights,
    criterionNames,
  });

  await upsertManualWeightsEvaluation({
    issueId: issue._id,
    userId,
    manualWeights,
    completed: true,
  });

  await markParticipationWeightsCompleted({
    ParticipationModel: Participation,
    issueId: issue._id,
    userId,
  });

  await syncIssueStageAfterWeightsCompletion(issue);

  return {
    success: true,
    msg: "Manual weights submitted successfully",
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

/**
 * Obtiene el contexto base de pesos BWM para un experto dentro de un issue.
 *
 * Valida:
 * - existencia del issue
 * - que el usuario siga siendo participante aceptado
 * - orden canónico de criterios hoja
 *
 * @param {object} params Parámetros de entrada.
 * @param {import("mongoose").Types.ObjectId | string} params.issueId Id del issue.
 * @param {import("mongoose").Types.ObjectId | string} params.userId Id del usuario actual.
 * @returns {Promise<{
 *   issue: Record<string, any>,
 *   participation: Record<string, any>,
 *   leafDocs: Array<Record<string, any>>,
 *   criterionNames: string[],
 * }>}
 */
const getBwmWeightsContextOrThrow = async ({ issueId, userId }) => {
  if (!issueId) {
    throw createBadRequestError("Issue id is required");
  }

  const issue = await Issue.findById(issueId);
  if (!issue) {
    throw createNotFoundError("Issue not found");
  }

  const participation = await getAcceptedParticipation(issue._id, userId);
  if (!participation) {
    throw createForbiddenError("You are no longer a participant in this issue");
  }

  await ensureIssueOrdersDb({ issueId: issue._id });

  const leafDocs = await getOrderedLeafCriteriaDb({
    issueId: issue._id,
    issueDoc: issue,
    select: "_id name",
    lean: true,
  });

  return {
    issue,
    participation,
    leafDocs,
    criterionNames: leafDocs.map((criterion) => criterion.name),
  };
};

/**
 * Normaliza los datos BWM para preservar las autofijaciones de la diagonal.
 *
 * Mantiene la lógica actual:
 * - bestCriterion frente a sí mismo vale 1
 * - worstCriterion frente a sí mismo vale 1
 *
 * @param {Record<string, any>} [bwmData={}] Datos BWM recibidos.
 * @returns {Record<string, any>}
 */
const normalizeBwmInput = (bwmData = {}) => {
  const normalized = {
    ...bwmData,
    bestToOthers: {
      ...(bwmData?.bestToOthers || {}),
    },
    othersToWorst: {
      ...(bwmData?.othersToWorst || {}),
    },
  };

  if (normalized.bestCriterion) {
    normalized.bestToOthers[normalized.bestCriterion] = 1;
  }

  if (normalized.worstCriterion) {
    normalized.othersToWorst[normalized.worstCriterion] = 1;
  }

  return normalized;
};

/**
 * Construye la respuesta BWM esperada por el frontend.
 *
 * Garantiza que todos los criterios hoja estén presentes y reemplaza
 * null/undefined por string vacío para no romper los inputs.
 *
 * @param {object} params Parámetros de entrada.
 * @param {Record<string, any> | null} params.evaluation Evaluación persistida.
 * @param {string[]} params.criterionNames Nombres de criterios hoja en orden canónico.
 * @returns {{
 *   bestCriterion: string,
 *   worstCriterion: string,
 *   bestToOthers: Record<string, string | number>,
 *   othersToWorst: Record<string, string | number>,
 *   completed: boolean,
 * }}
 */
const buildBwmResponseData = ({ evaluation, criterionNames }) => {
  const bestToOthers = {};
  const othersToWorst = {};

  for (const criterionName of criterionNames) {
    const bestValue = evaluation?.bestToOthers?.[criterionName];
    const worstValue = evaluation?.othersToWorst?.[criterionName];

    bestToOthers[criterionName] =
      bestValue === null || bestValue === undefined ? "" : bestValue;

    othersToWorst[criterionName] =
      worstValue === null || worstValue === undefined ? "" : worstValue;
  }

  return {
    bestCriterion: evaluation?.bestCriterion || "",
    worstCriterion: evaluation?.worstCriterion || "",
    bestToOthers,
    othersToWorst,
    completed: evaluation?.completed || false,
  };
};

/**
 * Valida los datos BWM finales y lanza un error enriquecido si son inválidos.
 *
 * @param {Record<string, any>} bwmData Datos BWM normalizados.
 * @returns {void}
 */
const validateSubmittedBwmDataOrThrow = (bwmData) => {
  const validation = validateFinalWeights(bwmData);

  if (!validation.valid) {
    const error = createBadRequestError(validation.msg || "Invalid BWM weight data");

    if (validation.field) {
      error.field = validation.field;
    }

    throw error;
  }
};

/**
 * Guarda una evaluación BWM para un experto.
 *
 * @param {object} params Parámetros de entrada.
 * @param {import("mongoose").Types.ObjectId | string} params.issueId Id del issue.
 * @param {import("mongoose").Types.ObjectId | string} params.userId Id del experto.
 * @param {Record<string, any>} params.bwmData Datos BWM ya normalizados.
 * @param {boolean} params.completed Indica si la evaluación queda enviada.
 * @returns {Promise<void>}
 */
const upsertBwmWeightsEvaluation = async ({
  issueId,
  userId,
  bwmData,
  completed,
}) => {
  const payload = buildBwmEvaluationPayload({
    issueId,
    userId,
    bwmData,
    send: completed,
  });

  await CriteriaWeightEvaluation.updateOne(
    { issue: issueId, expert: userId },
    { $set: payload },
    { upsert: true }
  );
};

/**
 * Obtiene los pesos BWM guardados del experto actual.
 *
 * @param {object} params Parámetros de entrada.
 * @param {import("mongoose").Types.ObjectId | string} params.issueId Id del issue.
 * @param {import("mongoose").Types.ObjectId | string} params.userId Id del experto.
 * @returns {Promise<{
 *   success: true,
 *   bwmData: {
 *     bestCriterion: string,
 *     worstCriterion: string,
 *     bestToOthers: Record<string, string | number>,
 *     othersToWorst: Record<string, string | number>,
 *     completed: boolean,
 *   },
 * }>}
 */
export const getBwmWeightsPayload = async ({ issueId, userId }) => {
  const { issue, criterionNames } = await getBwmWeightsContextOrThrow({
    issueId,
    userId,
  });

  const evaluation = await CriteriaWeightEvaluation.findOne({
    issue: issue._id,
    expert: userId,
  }).lean();

  return {
    success: true,
    bwmData: buildBwmResponseData({
      evaluation,
      criterionNames,
    }),
  };
};

/**
 * Guarda un borrador de pesos BWM para el experto actual.
 *
 * @param {object} params Parámetros de entrada.
 * @param {import("mongoose").Types.ObjectId | string} params.issueId Id del issue.
 * @param {import("mongoose").Types.ObjectId | string} params.userId Id del experto.
 * @param {Record<string, any>} params.bwmData Datos BWM recibidos.
 * @returns {Promise<{ success: true, msg: string }>}
 */
export const saveBwmWeightsDraftFlow = async ({
  issueId,
  userId,
  bwmData,
}) => {
  const { issue } = await getBwmWeightsContextOrThrow({
    issueId,
    userId,
  });

  const normalizedBwmData = normalizeBwmInput(bwmData);

  if (!normalizedBwmData.bestCriterion || !normalizedBwmData.worstCriterion) {
    throw createBadRequestError("Missing best or worst criterion");
  }

  await upsertBwmWeightsEvaluation({
    issueId: issue._id,
    userId,
    bwmData: normalizedBwmData,
    completed: false,
  });

  return {
    success: true,
    msg: "Weights saved successfully",
  };
};

/**
 * Valida y envía los pesos BWM del experto actual.
 *
 * @param {object} params Parámetros de entrada.
 * @param {import("mongoose").Types.ObjectId | string} params.issueId Id del issue.
 * @param {import("mongoose").Types.ObjectId | string} params.userId Id del experto.
 * @param {Record<string, any>} params.bwmData Datos BWM recibidos.
 * @returns {Promise<{ success: true, msg: string }>}
 */
export const submitBwmWeightsFlow = async ({
  issueId,
  userId,
  bwmData,
}) => {
  const { issue } = await getBwmWeightsContextOrThrow({
    issueId,
    userId,
  });

  const normalizedBwmData = normalizeBwmInput(bwmData);

  validateSubmittedBwmDataOrThrow(normalizedBwmData);

  await upsertBwmWeightsEvaluation({
    issueId: issue._id,
    userId,
    bwmData: normalizedBwmData,
    completed: true,
  });

  await markParticipationWeightsCompleted({
    ParticipationModel: Participation,
    issueId: issue._id,
    userId,
  });

  await syncIssueStageAfterWeightsCompletion(issue);

  return {
    success: true,
    msg: "Weights submitted successfully",
  };
};