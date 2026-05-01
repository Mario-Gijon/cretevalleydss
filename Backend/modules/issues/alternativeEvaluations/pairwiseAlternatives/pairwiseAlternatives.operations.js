import { Evaluation } from "../../../../models/Evaluations.js";
import { createBadRequestError } from "../../../../utils/common/errors.js";
import { toIdString } from "../../../../utils/common/ids.js";

import { formatPairwiseEvaluationsByCriterion } from "../../issue.mappers.js";

import {
  ensureIssueSnapshotIdsExist,
  getEvaluationReadContext,
  getEvaluationSaveContext,
  markParticipationEvaluationCompletedOrThrow,
} from "../alternativeEvaluation.shared.js";
import { validatePairwiseEvaluationsOrThrow } from "./pairwiseAlternatives.validation.js";

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
const buildPairwiseEvaluationSaveBulkOperations = ({
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
              consensusPhase: currentPhase,
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
 * @param {Object} params.issue Issue cargado.
 * @param {string} params.userId Id del usuario actual.
 * @param {Object} params.body Body HTTP completo.
 * @returns {Promise<Object>}
 */
export const savePairwiseEvaluationDrafts = async ({
  issue,
  userId,
  body,
}) => {
  const evaluations = body?.evaluations;

  const {
    issueId,
    currentPhase,
    defaultSnapshot,
    alternativeMap,
    criterionMap,
  } = await getEvaluationSaveContext({
    userId,
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
    buildPairwiseEvaluationSaveBulkOperations({
      userId,
      issueId,
      currentPhase,
      evaluations,
      alternativeMap,
      criterionMap,
      defaultSnapshotId,
    });

  await ensureIssueSnapshotIdsExist({
    issueId,
    snapshotIds,
  });

  if (bulkOperations.length > 0) {
    await Evaluation.bulkWrite(bulkOperations);
  }

  return { updatedCount: bulkOperations.length };
};

/**
 * Valida y envía las evaluaciones pairwise del experto actual.
 *
 * @param {object} params Parámetros de entrada.
 * @param {Object} params.issue Issue cargado.
 * @param {string} params.userId Id del usuario actual.
 * @param {Object} params.body Body HTTP completo.
 * @returns {Promise<Object>}
 */
export const submitPairwiseEvaluations = async ({
  issue,
  userId,
  body,
}) => {
  const evaluations = body?.evaluations;
  const issueId = toIdString(issue._id);
  validatePairwiseEvaluationsOrThrow(evaluations);

  await savePairwiseEvaluationDrafts({
    userId,
    body,
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
 * @param {Object} params.issue Issue cargado.
 * @param {string} params.userId Id del usuario actual.
 * @returns {Promise<Object>}
 */
export const getPairwiseEvaluationPayload = async ({
  issue,
  userId,
}) => {
  const { issue: issueDoc, latestConsensus, currentPhase } = await getEvaluationReadContext({
    userId,
    issue,
  });

  const evaluations = await Evaluation.find({
    issue: issueDoc._id,
    expert: userId,
    consensusPhase: currentPhase,
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
 * Construye el input para la resolución pairwise.
 *
 * @param {object} params Parámetros de entrada.
 * @returns {Promise<object>}
 */
export const buildPairwiseResolutionInput = async (params) => {
  return params;
};
