import { Consensus } from "../../../models/Consensus.js";

const normalizeRankedAlternatives = ({ rankedAlternatives, rankedWithScores }) => {
  if (Array.isArray(rankedAlternatives) && rankedAlternatives.length > 0) {
    return rankedAlternatives
      .map((item) => (typeof item === "string" ? item : item?.name))
      .filter((name) => typeof name === "string" && name.trim().length > 0);
  }

  if (Array.isArray(rankedWithScores) && rankedWithScores.length > 0) {
    return rankedWithScores
      .map((item) => item?.name)
      .filter((name) => typeof name === "string" && name.trim().length > 0);
  }

  return [];
};

const normalizeRankedWithScores = ({ rankedWithScores, consensusDetails }) => {
  if (Array.isArray(rankedWithScores)) {
    return rankedWithScores;
  }

  const fromDetails = consensusDetails?.rankedAlternatives;
  return Array.isArray(fromDetails) ? fromDetails : [];
};

const upsertConsensusHistoryRound = ({ issue, roundEntry }) => {
  const previousHistory = Array.isArray(issue.consensusHistory)
    ? issue.consensusHistory
    : [];
  const existingIndex = previousHistory.findIndex(
    (entry) => Number(entry?.phase) === Number(roundEntry.phase)
  );

  if (existingIndex === -1) {
    issue.consensusHistory = [...previousHistory, roundEntry].sort(
      (left, right) => Number(left?.phase || 0) - Number(right?.phase || 0)
    );
    return;
  }

  issue.consensusHistory = previousHistory.map((entry, index) =>
    index === existingIndex ? roundEntry : entry
  );
};

/**
 * Persiste el consenso resultante de una resolución de issue.
 *
 * @param {object} params Parámetros de entrada.
 * @param {Object} params.issue Issue actual.
 * @param {number} params.currentPhase Fase de consenso actual.
 * @param {number|null} params.consensusLevel Nivel de consenso calculado.
 * @param {Object} params.consensusDetails Detalle de consenso persistible.
 * @param {Object|null} params.collectiveEvaluations Evaluaciones colectivas.
 * @param {Array<string>|Array<Object>|null} [params.rankedAlternatives=null] Ranking normalizado.
 * @param {Array<Object>|null} [params.rankedWithScores=null] Ranking con puntuaciones.
 * @returns {Promise<Object>}
 */
export const saveResolutionConsensus = async ({
  issue,
  currentPhase,
  consensusLevel,
  consensusDetails,
  collectiveEvaluations,
  rankedAlternatives = null,
  rankedWithScores = null,
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

  const roundEntry = {
    phase: currentPhase,
    computedAt,
    consensusLevel: consensusLevel ?? null,
    rankedAlternatives: normalizeRankedAlternatives({
      rankedAlternatives,
      rankedWithScores,
    }),
    rankedWithScores: normalizeRankedWithScores({
      rankedWithScores,
      consensusDetails,
    }),
    collectiveEvaluations: collectiveEvaluations ?? null,
    feedback: consensusDetails?.feedback ?? null,
    recommendations: consensusDetails?.recommendations ?? null,
    modelExecution: {
      apiModelKey: consensusDetails?.modelExecution?.apiModelKey ?? null,
      apiEndpoint: consensusDetails?.modelExecution?.apiEndpoint ?? null,
      inputKind: consensusDetails?.modelExecution?.inputKind ?? null,
      outputKind: consensusDetails?.modelExecution?.outputKind ?? null,
      rawOutput: consensusDetails?.modelExecution?.rawOutput ?? null,
      executedAt: consensusDetails?.modelExecution?.executedAt ?? computedAt,
    },
  };

  upsertConsensusHistoryRound({
    issue,
    roundEntry,
  });
  await issue.save();

  return consensus;
};
