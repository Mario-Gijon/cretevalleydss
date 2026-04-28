import { CriteriaWeightEvaluation } from "../../../models/CriteriaWeightEvaluation.js";
import { Participation } from "../../../models/Participations.js";

import { getOrderedLeafCriteriaDb } from "../issue.ordering.js";

import { createBadRequestError } from "../../../utils/common/errors.js";

import {
  getCollectiveWeightsContextOrThrow,
  getWeightEvaluationContextOrThrow,
  markParticipationWeightsCompleted,
  syncIssueStageAfterWeightsCompletion,
} from "./weightEvaluation.shared.js";

const MANUAL_WEIGHTS_SUM_TOLERANCE = 0.001;

/**
 * Construye el objeto manualWeights ordenado canónicamente desde la entrada.
 *
 * @param {Object} raw Pesos recibidos.
 * @param {Array<Object>} leafDocs Criterios hoja ordenados.
 * @returns {Object}
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
 * @param {Object} body Cuerpo de la petición.
 * @returns {Object}
 */
export const getRawManualWeightsPayload = (body) =>
  body?.manualWeights ||
  body?.weights?.manualWeights ||
  body?.weights ||
  {};

/**
 * Convierte unos pesos manuales persistidos al formato esperado por el frontend.
 *
 * Mantiene todas las claves en el orden canónico de criterios y reemplaza
 * null/undefined por string vacío para no romper los inputs del formulario.
 *
 * @param {object} params Parámetros de entrada.
 * @param {Object} [params.manualWeights={}] Pesos persistidos.
 * @param {string[]} params.criterionNames Nombres de criterios hoja en orden canónico.
 * @returns {Object.<string, string|number>}
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
 * @param {Object.<string, number|null>} params.manualWeights Pesos manuales ordenados.
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
 * @param {string|Object} params.issueId Id del issue.
 * @param {string|Object} params.userId Id del experto.
 * @param {Object.<string, number|null>} params.manualWeights Pesos manuales ordenados.
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
 * @param {string|Object} params.issueId Id del issue.
 * @param {string|Object} params.userId Id del experto.
 * @returns {Promise<Object>}
 */
export const getManualWeightEvaluation = async ({ issueId, userId }) => {
  const { issue, criterionNames } = await getWeightEvaluationContextOrThrow({
    issueId,
    userId,
  });

  const evaluation = await CriteriaWeightEvaluation.findOne({
    issue: issue._id,
    expert: userId,
  }).lean();

  return {
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
 * @param {string|Object} params.issueId Id del issue.
 * @param {string|Object} params.userId Id del experto.
 * @param {Object} params.body Cuerpo recibido en la request.
 * @returns {Promise<Object>}
 */
export const saveManualWeightDraft = async ({
  issueId,
  userId,
  body,
}) => {
  const { issue, leafDocs } = await getWeightEvaluationContextOrThrow({
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
    message: "Manual weights saved successfully",
  };
};

/**
 * Valida y envía los pesos manuales del experto actual.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string|Object} params.issueId Id del issue.
 * @param {string|Object} params.userId Id del experto.
 * @param {Object} params.body Cuerpo recibido en la request.
 * @returns {Promise<Object>}
 */
export const submitManualWeights = async ({
  issueId,
  userId,
  body,
}) => {
  const { issue, leafDocs, criterionNames } =
    await getWeightEvaluationContextOrThrow({
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
    issueId: issue._id,
    userId,
  });

  await syncIssueStageAfterWeightsCompletion(issue);

  return {
    message: "Manual weights submitted successfully",
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
 * @param {Array<Object>} params.evaluations Evaluaciones manuales completadas.
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
 * Calcula pesos manuales colectivos y actualiza el issue.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string|Object} params.issueId Id del issue.
 * @param {string|Object} params.userId Id del usuario actual.
 * @returns {Promise<Object>}
 */
export const computeManualWeights = async ({
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
    finished: true,
    message: "Criteria weights computed",
    weights: issue.modelParameters.weights,
    criteriaOrder: criterionNames,
  };
};
