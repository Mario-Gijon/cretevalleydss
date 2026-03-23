import { Participation } from "../models/Participations.js";

/**
 * Genera las matrices de evaluación pairwise agrupadas por experto.
 *
 * @param {string|Object} issueId Id del issue.
 * @returns {Promise<Object>}
 */
export const generateEvaluationMatrices = async (issueId) => {
  const evaluationsByExpert = {};

  const participations = await Participation.find({ issue: issueId })
    .populate("expert")
    .populate("evaluations");

  for (const participation of participations) {
    const expertEmail = participation.expert.email;

    if (!evaluationsByExpert[expertEmail]) {
      evaluationsByExpert[expertEmail] = {};
    }

    for (const evaluation of participation.evaluations) {
      const criterionName = evaluation.criterion.name;
      const pairwiseMatrix = evaluation.pairwiseMatrix;

      evaluationsByExpert[expertEmail][criterionName] = pairwiseMatrix;
    }
  }

  return evaluationsByExpert;
};