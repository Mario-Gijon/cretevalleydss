import { Consensus } from "../../../models/Consensus.js";

/**
 * Persiste el consenso resultante de una resolución de issue.
 *
 * @param {object} params Parámetros de entrada.
 * @param {Object} params.issue Issue actual.
 * @param {number} params.currentPhase Fase de consenso actual.
 * @param {number|null} params.consensusLevel Nivel de consenso calculado.
 * @param {Object} params.consensusDetails Detalle de consenso persistible.
 * @param {Object|null} params.collectiveEvaluations Evaluaciones colectivas.
 * @returns {Promise<Object>}
 */
export const saveResolutionConsensus = async ({
  issue,
  currentPhase,
  consensusLevel,
  consensusDetails,
  collectiveEvaluations,
}) => {
  const computedAt = new Date();
  const consensus = await Consensus.findOneAndUpdate(
    {
      issue: issue._id,
      phase: currentPhase,
    },
    {
      $set: {
        level: consensusLevel,
        timestamp: computedAt,
        details: consensusDetails,
        collectiveEvaluations,
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  );

  return consensus;
};
