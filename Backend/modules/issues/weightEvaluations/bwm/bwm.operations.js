import axios from "axios";

import { CriteriaWeightEvaluation } from "../../../../models/CriteriaWeightEvaluation.js";
import { Participation } from "../../../../models/Participations.js";

import { getOrderedLeafCriteriaDb } from "../../issue.ordering.js";
import { validateFinalWeights } from "../../issue.validation.js";

import { createBadRequestError } from "../../../../utils/common/errors.js";
import {
  createModelApiRequestError,
  unwrapModelApiResponse,
} from "../../../../services/modelApi/modelResponse.js";

import {
  getCollectiveWeightsContextOrThrow,
  getWeightEvaluationContextOrThrow,
  markParticipationWeightsCompleted,
  syncIssueStageAfterWeightsCompletion,
  toNullableIntMap,
} from "../weightEvaluation.shared.js";

/**
 * Construye el payload persistible de una evaluación BWM.
 *
 * @param {object} params Parámetros de entrada.
 * @param {Object} params.issue Issue cargado.
 * @param {string|Object} params.userId Id del experto.
 * @param {Object} params.bwmData Datos BWM recibidos.
 * @param {boolean} [params.completed=false] Indica si se marca como completado.
 * @returns {Object}
 */
export const buildBwmEvaluationPayload = ({
  issue,
  userId,
  bwmData,
  completed = false,
}) => ({
  issue: issue._id,
  expert: userId,
  weightingMode: issue.weightingMode,
  input: {
    bwmData: {
      bestCriterion: bwmData.bestCriterion,
      worstCriterion: bwmData.worstCriterion,
      bestToOthers: toNullableIntMap(bwmData.bestToOthers),
      othersToWorst: toNullableIntMap(bwmData.othersToWorst),
    },
  },
  completed,
  consensusPhase: 1,
});

/**
 * Obtiene el payload BWM desde el contrato canónico.
 *
 * @param {Object} body Cuerpo de la petición.
 * @returns {Object}
 */
const getBwmDataPayloadOrThrow = (body) => {
  const bwmData = body?.bwmData;

  if (!bwmData || typeof bwmData !== "object" || Array.isArray(bwmData)) {
    throw createBadRequestError("bwmData is required", {
      field: "bwmData",
    });
  }

  return bwmData;
};

/**
 * Normaliza los datos BWM para preservar las autofijaciones de la diagonal.
 *
 * Mantiene la lógica actual:
 * - bestCriterion frente a sí mismo vale 1
 * - worstCriterion frente a sí mismo vale 1
 *
 * @param {Object} [bwmData={}] Datos BWM recibidos.
 * @returns {Object}
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
 * @param {Object|null} params.evaluation Evaluación persistida.
 * @param {string[]} params.criterionNames Nombres de criterios hoja en orden canónico.
 * @returns {Object}
 */
const buildBwmResponseData = ({ evaluation, criterionNames }) => {
  const persistedBwmData = evaluation?.input?.bwmData || {};
  const bestToOthers = {};
  const othersToWorst = {};

  for (const criterionName of criterionNames) {
    const bestValue = persistedBwmData?.bestToOthers?.[criterionName];
    const worstValue = persistedBwmData?.othersToWorst?.[criterionName];

    bestToOthers[criterionName] =
      bestValue === null || bestValue === undefined ? "" : bestValue;

    othersToWorst[criterionName] =
      worstValue === null || worstValue === undefined ? "" : worstValue;
  }

  return {
    bestCriterion: persistedBwmData?.bestCriterion || "",
    worstCriterion: persistedBwmData?.worstCriterion || "",
    bestToOthers,
    othersToWorst,
    completed: evaluation?.completed || false,
  };
};

/**
 * Valida los datos BWM finales y lanza un error enriquecido si son inválidos.
 *
 * @param {Object} bwmData Datos BWM normalizados.
 * @returns {void}
 */
const validateSubmittedBwmDataOrThrow = (bwmData) => {
  const validation = validateFinalWeights(bwmData);

  if (!validation.valid) {
    const error = createBadRequestError(
      validation.message || "Invalid BWM weight data"
    );

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
 * @param {Object} params.issue Issue cargado.
 * @param {string|Object} params.userId Id del experto.
 * @param {Object} params.bwmData Datos BWM ya normalizados.
 * @param {boolean} params.completed Indica si la evaluación queda enviada.
 * @returns {Promise<void>}
 */
const upsertBwmWeightsEvaluation = async ({
  issue,
  userId,
  bwmData,
  completed,
}) => {
  const issueId = issue._id;
  const payload = buildBwmEvaluationPayload({
    issue,
    userId,
    bwmData,
    completed,
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
 * @param {Object} params.issue Issue cargado.
 * @param {string|Object} params.userId Id del experto.
 * @returns {Promise<Object>}
 */
export const getBwmWeightEvaluation = async ({ issue, userId }) => {
  const { issueId, criterionNames } = await getWeightEvaluationContextOrThrow({
    issue,
    userId,
  });

  const evaluation = await CriteriaWeightEvaluation.findOne({
    issue: issueId,
    expert: userId,
  }).lean();

  return {
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
 * @param {Object} params.issue Issue cargado.
 * @param {string|Object} params.userId Id del experto.
 * @param {Object} params.body Cuerpo recibido en la request.
 * @returns {Promise<Object>}
 */
export const saveBwmWeightDraft = async ({
  issue,
  userId,
  body,
}) => {
  await getWeightEvaluationContextOrThrow({
    issue,
    userId,
  });

  const bwmData = getBwmDataPayloadOrThrow(body);
  const normalizedBwmData = normalizeBwmInput(bwmData);

  if (!normalizedBwmData.bestCriterion || !normalizedBwmData.worstCriterion) {
    throw createBadRequestError("Missing best or worst criterion");
  }

  await upsertBwmWeightsEvaluation({
    issue,
    userId,
    bwmData: normalizedBwmData,
    completed: false,
  });

  return {
    message: "Weights saved successfully",
  };
};

/**
 * Valida y envía los pesos BWM del experto actual.
 *
 * @param {object} params Parámetros de entrada.
 * @param {Object} params.issue Issue cargado.
 * @param {string|Object} params.userId Id del experto.
 * @param {Object} params.body Cuerpo recibido en la request.
 * @returns {Promise<Object>}
 */
export const submitBwmWeights = async ({
  issue,
  userId,
  body,
}) => {
  const { issueId } = await getWeightEvaluationContextOrThrow({
    issue,
    userId,
  });

  const bwmData = getBwmDataPayloadOrThrow(body);
  const normalizedBwmData = normalizeBwmInput(bwmData);

  validateSubmittedBwmDataOrThrow(normalizedBwmData);

  await upsertBwmWeightsEvaluation({
    issue,
    userId,
    bwmData: normalizedBwmData,
    completed: true,
  });

  await markParticipationWeightsCompleted({
    issueId,
    userId,
  });

  await syncIssueStageAfterWeightsCompletion(issue);

  return {
    message: "Weights submitted successfully",
  };
};

/**
 * Calcula pesos BWM colectivos y actualiza el issue.
 *
 * @param {object} params Parámetros de entrada.
 * @param {Object} params.issue Issue cargado.
 * @param {string|Object} params.userId Id del usuario actual.
 * @param {string} [params.apiModelsBaseUrl] Base URL del servicio de modelos.
 * @param {Object} [params.httpClient] Cliente HTTP.
 * @returns {Promise<Object>}
 */
export const computeBwmWeights = async ({
  issue,
  userId,
  apiModelsBaseUrl = process.env.ORIGIN_APIMODELS || "http://localhost:7000",
  httpClient = axios,
}) => {
  const issueDoc = await getCollectiveWeightsContextOrThrow({
    issue,
    userId,
  });

  const pendingWeights = await Participation.find({
    issue: issueDoc._id,
    invitationStatus: { $in: ["accepted", "pending"] },
    weightsCompleted: false,
  });

  if (pendingWeights.length > 0) {
    throw createBadRequestError(
      "Not all experts have completed their criteria weight evaluations"
    );
  }

  const criteria = await getOrderedLeafCriteriaDb({
    issueId: issueDoc._id,
    issueDoc,
    select: "_id name",
    lean: true,
  });

  const criterionNames = criteria.map((criterion) => criterion.name);

  const weightEvaluations = await CriteriaWeightEvaluation.find({
    issue: issueDoc._id,
  }).populate("expert", "email");

  if (weightEvaluations.length === 0) {
    throw createBadRequestError("No BWM evaluations found for this issue");
  }

  const expertsData = {};

  for (const evaluation of weightEvaluations) {
    const bwmData = evaluation.input?.bwmData || {};
    const {
      bestCriterion,
      worstCriterion,
      bestToOthers,
      othersToWorst,
    } = bwmData;

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

  let response;
  try {
    response = await httpClient.post(`${apiModelsBaseUrl}/bwm`, {
      experts_data: expertsData,
      eps_penalty: 1,
    });
  } catch (error) {
    throw createModelApiRequestError(error);
  }

  const results = unwrapModelApiResponse(response);

  const weights = results?.weights || [];

  issueDoc.modelParameters = {
    ...(issueDoc.modelParameters || {}),
    weights: weights.slice(0, criterionNames.length),
  };

  issueDoc.currentStage = "alternativeEvaluation";
  await issueDoc.save();

  return {
    finished: true,
    message: `Criteria weights for '${issueDoc.name}' successfully computed.`,
    weights: issueDoc.modelParameters.weights,
    criteriaOrder: criterionNames,
  };
};

export const bwmWeightEvaluations = Object.freeze({
  read: getBwmWeightEvaluation,
  saveDraft: saveBwmWeightDraft,
  submit: submitBwmWeights,
  compute: computeBwmWeights,
});
