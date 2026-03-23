import { CriteriaWeightEvaluation } from "../models/CriteriaWeightEvaluation.js";
import { Evaluation } from "../models/Evaluations.js";

/**
 * Elimina borradores no enviados de un experto al salir de un issue.
 *
 * @param {Object} params Datos de entrada.
 * @param {string|Object} params.issueId Id del issue.
 * @param {string|Object} params.expertId Id del experto.
 * @returns {Promise<void>}
 */
export const cleanupExpertDraftsOnExit = async ({ issueId, expertId }) => {
  await CriteriaWeightEvaluation.deleteMany({
    issue: issueId,
    expert: expertId,
    completed: false,
  });

  const hasSubmittedSomething = await Evaluation.exists({
    issue: issueId,
    expert: expertId,
    $or: [
      { timestamp: { $ne: null } },
      { history: { $elemMatch: { timestamp: { $ne: null } } } },
    ],
  });

  if (!hasSubmittedSomething) {
    await Evaluation.deleteMany({ issue: issueId, expert: expertId });
  }
};