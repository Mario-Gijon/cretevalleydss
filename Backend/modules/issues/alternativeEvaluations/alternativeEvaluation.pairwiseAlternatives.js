import { Evaluation } from "../../../models/Evaluations.js";
import { createBadRequestError } from "../../../utils/common/errors.js";
import { toIdString } from "../../../utils/common/ids.js";

import { formatPairwiseEvaluationsByCriterion } from "../issue.mappers.js";
import { validateFinalPairwiseEvaluations } from "../issue.validation.js";

import { EVALUATION_STRUCTURES } from "./alternativeEvaluation.constants.js";
import {
  ensureIssueSnapshotIdsExist,
  getEvaluationReadContext,
  getEvaluationSaveContext,
  markParticipationEvaluationCompletedOrThrow,
} from "./alternativeEvaluation.shared.js";

/**
 * Construye las operaciones bulk para guardar evaluaciones pairwise.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string} params.userId Id del experto actual.
 * @param {string} params.issueId Id del issue.
 * @param {number} params.currentPhase Fase de consenso actual.
 * @param {Object} params.evaluations Evaluaciones pairwise recibidas.
 * @param {Map<string, string>} params.alternativeMap Mapa de alternativas por nombre.
 * @param {Map<string, string>} params.criterionMap Mapa de criterios por nombre.
 * @param {string} params.defaultSnapshotId Snapshot por defecto del issue.
 * @returns {Object}
 */
export const buildPairwiseEvaluationBulkOperations = ({
  userId,
  issueId,
  currentPhase,
  evaluations,
  alternativeMap,
  criterionMap,
  defaultSnapshotId,
}) => {
  const bulkOperations = [];
  const snapshotIds = new Set();

  for (const [criterionName, evaluationsByAlternative] of Object.entries(
    evaluations || {}
  )) {
    const criterionId = criterionMap.get(criterionName);
    if (!criterionId) continue;

    for (const evaluationData of evaluationsByAlternative || []) {
      const { id: alternativeName, ...rest } = evaluationData || {};
      const alternativeId = alternativeMap.get(alternativeName);
      if (!alternativeId) continue;

      const rowSnapshotId =
        toIdString(rest?.expressionDomain?.id) ||
        toIdString(rest?.domain?.id) ||
        defaultSnapshotId;

      const comparisons = { ...rest };
      delete comparisons.expressionDomain;
      delete comparisons.domain;

      for (const [comparedAlternativeName, valueOrObj] of Object.entries(
        comparisons
      )) {
        if (comparedAlternativeName === alternativeName) continue;

        const comparedAlternativeId =
          alternativeMap.get(comparedAlternativeName);
        if (!comparedAlternativeId) continue;

        const value =
          valueOrObj &&
          typeof valueOrObj === "object" &&
          "value" in valueOrObj
            ? valueOrObj.value
            : valueOrObj;

        const cellSnapshotId =
          toIdString(valueOrObj?.expressionDomain?.id) ||
          toIdString(valueOrObj?.domain?.id) ||
          rowSnapshotId ||
          defaultSnapshotId;

        if (cellSnapshotId) {
          snapshotIds.add(cellSnapshotId);
        }

        bulkOperations.push({
          updateOne: {
            filter: {
              expert: userId,
              issue: issueId,
              alternative: alternativeId,
              comparedAlternative: comparedAlternativeId,
              criterion: criterionId,
            },
            update: {
              $set: {
                value,
                expressionDomain: cellSnapshotId,
                timestamp: new Date(),
                consensusPhase: currentPhase,
              },
            },
            upsert: true,
          },
        });
      }
    }
  }

  return {
    bulkOperations,
    snapshotIds: Array.from(snapshotIds),
  };
};

/**
 * Guarda borradores de evaluaciones pairwise.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string} params.issueId Id del issue.
 * @param {string} params.userId Id del usuario actual.
 * @param {Object} params.evaluations Evaluaciones pairwise recibidas.
 * @param {Object|null} [params.issue=null] Issue precargado para evitar recarga por id.
 * @returns {Promise<Object>}
 */
export const savePairwiseEvaluationDrafts = async ({
  issueId,
  userId,
  evaluations,
  issue = null,
}) => {
  const {
    issue: issueDoc,
    currentPhase,
    defaultSnapshot,
    alternativeMap,
    criterionMap,
  } = await getEvaluationSaveContext({
    issueId,
    userId,
    expectedStructure: EVALUATION_STRUCTURES.PAIRWISE_ALTERNATIVES,
    invalidStructureMessage:
      "This issue does not use pairwise alternative evaluation",
    requireDefaultSnapshot: true,
    issue,
  });

  const defaultSnapshotId = toIdString(defaultSnapshot?._id);
  if (!defaultSnapshotId) {
    throw createBadRequestError(
      "This issue has no IssueExpressionDomain snapshots."
    );
  }

  const { bulkOperations, snapshotIds } =
    buildPairwiseEvaluationBulkOperations({
      userId,
      issueId: toIdString(issueDoc._id),
      currentPhase,
      evaluations,
      alternativeMap,
      criterionMap,
      defaultSnapshotId,
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
 * Construye un error de validación para evaluaciones pairwise.
 *
 * @param {Object} validation Resultado de validación.
 * @returns {Error}
 */
const buildPairwiseEvaluationValidationError = (validation) =>
  createBadRequestError(
    validation?.error?.message || "Invalid pairwise evaluations",
    {
      field: "evaluations",
      details: {
        criterion: validation?.error?.criterion ?? null,
        row: validation?.error?.row ?? null,
        col: validation?.error?.col ?? null,
      },
    }
  );

/**
 * Valida y envía las evaluaciones pairwise del experto actual.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string} params.issueId Id del issue.
 * @param {string} params.userId Id del usuario actual.
 * @param {Object} params.evaluations Evaluaciones pairwise recibidas.
 * @param {Object|null} [params.issue=null] Issue precargado para evitar recarga por id.
 * @returns {Promise<Object>}
 */
export const submitPairwiseEvaluations = async ({
  issueId,
  userId,
  evaluations,
  issue = null,
}) => {
  const validation = validateFinalPairwiseEvaluations(evaluations);

  if (!validation.valid) {
    throw buildPairwiseEvaluationValidationError(validation);
  }

  await savePairwiseEvaluationDrafts({
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
 * Obtiene el payload de evaluaciones pairwise del experto actual.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string} params.issueId Id del issue.
 * @param {string} params.userId Id del usuario actual.
 * @param {Object|null} [params.issue=null] Issue precargado para evitar recarga por id.
 * @returns {Promise<Object>}
 */
export const getPairwiseEvaluationPayload = async ({
  issueId,
  userId,
  issue = null,
}) => {
  const { issue: issueDoc, latestConsensus } = await getEvaluationReadContext({
    issueId,
    userId,
    expectedStructure: EVALUATION_STRUCTURES.PAIRWISE_ALTERNATIVES,
    invalidStructureMessage:
      "This issue does not use pairwise alternative evaluation",
    issue,
  });

  const evaluations = await Evaluation.find({
    issue: issueDoc._id,
    expert: userId,
  })
    .populate("alternative")
    .populate("comparedAlternative")
    .populate("criterion")
    .populate({
      path: "expressionDomain",
      populate: {
        path: "sourceDomain",
        select: "numericRange",
      },
    })
    .lean();

  const formattedEvaluations = formatPairwiseEvaluationsByCriterion(evaluations);

  return {
    evaluations: formattedEvaluations,
    collectiveEvaluations: latestConsensus?.collectiveEvaluations || null,
  };
};

/**
 * Operaciones de evaluación alternativa pairwise.
 */
export const pairwiseAlternativeEvaluations = Object.freeze({
  read: getPairwiseEvaluationPayload,
  saveDraft: savePairwiseEvaluationDrafts,
  submit: submitPairwiseEvaluations,
});
