import { Alternative } from "../../../models/Alternatives.js";
import { Criterion } from "../../../models/Criteria.js";
import { Evaluation } from "../../../models/Evaluations.js";
import { createBadRequestError } from "../../../utils/common/errors.js";
import { toIdString } from "../../../utils/common/ids.js";

import { formatExpressionDomainForClient } from "../issue.mappers.js";
import { validateFinalEvaluations } from "../issue.validation.js";

import { EVALUATION_STRUCTURES } from "./alternativeEvaluation.constants.js";
import {
  ensureIssueSnapshotIdsExist,
  getEvaluationReadContext,
  getEvaluationSaveContext,
  markParticipationEvaluationCompletedOrThrow,
} from "./alternativeEvaluation.shared.js";

/**
 * Construye las operaciones bulk para guardar evaluaciones directas.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string} params.userId Id del experto actual.
 * @param {string} params.issueId Id del issue.
 * @param {number} params.currentPhase Fase de consenso actual.
 * @param {Object} params.evaluations Evaluaciones directas recibidas.
 * @param {Map<string, string>} params.alternativeMap Mapa de alternativas por nombre.
 * @param {Map<string, string>} params.criterionMap Mapa de criterios por nombre.
 * @returns {Object}
 */
export const buildDirectEvaluationBulkOperations = ({
  userId,
  issueId,
  currentPhase,
  evaluations,
  alternativeMap,
  criterionMap,
}) => {
  const bulkOperations = [];
  const snapshotIds = new Set();

  for (const [alternativeName, criterionEvaluations] of Object.entries(
    evaluations || {}
  )) {
    const alternativeId = alternativeMap.get(alternativeName);
    if (!alternativeId) continue;

    for (const [criterionName, evaluationData] of Object.entries(
      criterionEvaluations || {}
    )) {
      const criterionId = criterionMap.get(criterionName);
      if (!criterionId) continue;

      const { value, domain } = evaluationData || {};
      const snapshotId = toIdString(domain?.id) || null;

      if (snapshotId) {
        snapshotIds.add(snapshotId);
      }

      bulkOperations.push({
        updateOne: {
          filter: {
            expert: userId,
            issue: issueId,
            alternative: alternativeId,
            criterion: criterionId,
            comparedAlternative: null,
          },
          update: {
            $set: {
              value,
              expressionDomain: snapshotId,
              timestamp: new Date(),
              consensusPhase: currentPhase,
            },
          },
          upsert: true,
        },
      });
    }
  }

  return {
    bulkOperations,
    snapshotIds: Array.from(snapshotIds),
  };
};

/**
 * Guarda borradores de evaluaciones directas.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string} params.issueId Id del issue.
 * @param {string} params.userId Id del usuario actual.
 * @param {Object} params.evaluations Evaluaciones directas recibidas.
 * @param {Object|null} [params.issue=null] Issue precargado para evitar recarga por id.
 * @returns {Promise<Object>}
 */
export const saveDirectEvaluationDrafts = async ({
  issueId,
  userId,
  evaluations,
  issue = null,
}) => {
  const { issue: issueDoc, currentPhase, alternativeMap, criterionMap } =
    await getEvaluationSaveContext({
      issueId,
      userId,
      expectedStructure: EVALUATION_STRUCTURES.DIRECT,
      invalidStructureMessage:
        "This issue uses pairwise alternative evaluation",
      issue,
    });

  const { bulkOperations, snapshotIds } = buildDirectEvaluationBulkOperations({
    userId,
    issueId: toIdString(issueDoc._id),
    currentPhase,
    evaluations,
    alternativeMap,
    criterionMap,
  });

  await ensureIssueSnapshotIdsExist({
    issueId: toIdString(issueDoc._id),
    snapshotIds,
  });

  if (bulkOperations.length > 0) {
    await Evaluation.bulkWrite(bulkOperations);
  }

  return { updatedCount: bulkOperations.length };
};

/**
 * Construye un error de validación para evaluaciones directas.
 *
 * @param {Object} validation Resultado de validación.
 * @returns {Error}
 */
const buildDirectEvaluationValidationError = (validation) =>
  createBadRequestError(
    validation?.error?.message || "Invalid direct evaluations",
    {
      field: "evaluations",
      details: {
        alternative: validation?.error?.alternative ?? null,
        criterion: validation?.error?.criterion ?? null,
      },
    }
  );

/**
 * Valida y envía las evaluaciones directas del experto actual.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string} params.issueId Id del issue.
 * @param {string} params.userId Id del usuario actual.
 * @param {Object} params.evaluations Evaluaciones directas recibidas.
 * @param {Object|null} [params.issue=null] Issue precargado para evitar recarga por id.
 * @returns {Promise<Object>}
 */
export const submitDirectEvaluations = async ({
  issueId,
  userId,
  evaluations,
  issue = null,
}) => {
  const validation = validateFinalEvaluations(evaluations);

  if (!validation.valid) {
    throw buildDirectEvaluationValidationError(validation);
  }

  await saveDirectEvaluationDrafts({
    issueId,
    userId,
    evaluations,
    issue,
  });

  await markParticipationEvaluationCompletedOrThrow({
    issueId,
    userId,
  });

  return {
    message: "Evaluations submitted successfully",
  };
};

/**
 * Obtiene el payload de evaluaciones directas del experto actual.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string} params.issueId Id del issue.
 * @param {string} params.userId Id del usuario actual.
 * @param {Object|null} [params.issue=null] Issue precargado para evitar recarga por id.
 * @returns {Promise<Object>}
 */
export const getDirectEvaluationPayload = async ({
  issueId,
  userId,
  issue = null,
}) => {
  const { issue: issueDoc, latestConsensus } = await getEvaluationReadContext({
    issueId,
    userId,
    expectedStructure: EVALUATION_STRUCTURES.DIRECT,
    invalidStructureMessage:
      "This issue uses pairwise alternative evaluation",
    issue,
  });

  const [alternatives, criteria, evaluationDocs] = await Promise.all([
    Alternative.find({ issue: issueDoc._id }).sort({ name: 1 }).lean(),
    Criterion.find({ issue: issueDoc._id, isLeaf: true }).sort({ name: 1 }).lean(),
    Evaluation.find({
      issue: issueDoc._id,
      expert: userId,
      comparedAlternative: null,
    })
      .populate("alternative")
      .populate("criterion")
      .populate({
        path: "expressionDomain",
        populate: {
          path: "sourceDomain",
          select: "numericRange",
        },
      })
      .lean(),
  ]);

  const evaluationMap = new Map();

  for (const evaluation of evaluationDocs) {
    const alternativeId = toIdString(evaluation.alternative?._id);
    const criterionId = toIdString(evaluation.criterion?._id);

    if (!alternativeId || !criterionId) continue;

    evaluationMap.set(`${alternativeId}_${criterionId}`, evaluation);
  }

  const evaluationsByAlternative = {};

  for (const alternative of alternatives) {
    evaluationsByAlternative[alternative.name] = {};

    for (const criterion of criteria) {
      const key = `${toIdString(alternative._id)}_${toIdString(criterion._id)}`;
      const evaluation = evaluationMap.get(key);

      evaluationsByAlternative[alternative.name][criterion.name] = {
        value: evaluation?.value ?? "",
        domain: formatExpressionDomainForClient(evaluation?.expressionDomain),
      };
    }
  }

  return {
    evaluations: evaluationsByAlternative,
    collectiveEvaluations: latestConsensus?.collectiveEvaluations || null,
  };
};

/**
 * Operaciones de evaluación alternativa directa.
 */
export const directAlternativeEvaluations = Object.freeze({
  read: getDirectEvaluationPayload,
  saveDraft: saveDirectEvaluationDrafts,
  submit: submitDirectEvaluations,
});
