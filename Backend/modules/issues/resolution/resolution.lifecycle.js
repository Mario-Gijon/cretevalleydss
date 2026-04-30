import { Participation } from "../../../models/Participations.js";

/**
 * Aplica la lógica de ciclo de vida posterior al guardado de consenso en resolución directa.
 *
 * @param {object} params Parámetros de entrada.
 * @param {Object} params.issue Issue actual.
 * @param {boolean} [params.forceFinalize=false] Fuerza finalización.
 * @param {number} params.currentPhase Fase de consenso actual.
 * @param {Array<string>} params.rankedAlternatives Ranking final de alternativas.
 * @param {Object} params.rawResults Resultado crudo del modelo.
 * @returns {Promise<Object>}
 */
export const handleDirectResolutionLifecycle = async ({
  issue,
  forceFinalize = false,
  currentPhase,
  rankedAlternatives,
  rawResults,
}) => {
  if (issue.isConsensus) {
    if (forceFinalize) {
      issue.active = false;
      await issue.save();

      return {
        finished: true,
        message: `Issue '${issue.name}' resolved as final round due to closure date.`,
        rankedAlternatives,
      };
    }

    if (issue.consensusMaxPhases && currentPhase >= issue.consensusMaxPhases) {
      issue.active = false;
      await issue.save();

      return {
        finished: true,
        message: `Issue '${issue.name}' resolved: maximum number of consensus rounds reached.`,
        rankedAlternatives,
      };
    }

    if (rawResults.cm && rawResults.cm >= issue.consensusThreshold) {
      issue.active = false;
      await issue.save();

      return {
        finished: true,
        message: `Issue '${issue.name}' resolved: consensus threshold ${issue.consensusThreshold} reached.`,
        rankedAlternatives,
      };
    }

    await Participation.updateMany(
      { issue: issue._id },
      { $set: { evaluationCompleted: false } }
    );

    return {
      finished: false,
      message: `Issue '${issue.name}' consensus threshold not reached. Another round is needed.`,
    };
  }

  issue.active = false;
  issue.currentStage = "finished";
  await issue.save();

  return {
    finished: true,
    message: `Issue '${issue.name}' resolved.`,
    rankedAlternatives,
  };
};

/**
 * Aplica la lógica de ciclo de vida posterior al guardado de consenso en resolución pairwise.
 *
 * @param {object} params Parámetros de entrada.
 * @param {Object} params.issue Issue actual.
 * @param {boolean} [params.forceFinalize=false] Fuerza finalización.
 * @param {number} params.currentPhase Fase de consenso actual.
 * @param {number} params.consensusLevel Nivel de consenso calculado.
 * @param {Array<Object>} params.rankedWithScores Ranking con scores.
 * @returns {Promise<Object>}
 */
export const handlePairwiseResolutionLifecycle = async ({
  issue,
  forceFinalize = false,
  currentPhase,
  consensusLevel,
  rankedWithScores,
}) => {
  if (issue.isConsensus && forceFinalize) {
    issue.active = false;
    await issue.save();

    return {
      finished: true,
      message: `Issue '${issue.name}' resolved as final round due to closure date.`,
      rankedAlternatives: rankedWithScores,
    };
  }

  if (issue.consensusMaxPhases && currentPhase >= issue.consensusMaxPhases) {
    issue.active = false;
    await issue.save();

    return {
      finished: true,
      message: `Issue '${issue.name}' resolved: maximum number of consensus rounds reached.`,
      rankedAlternatives: rankedWithScores,
    };
  }

  if (consensusLevel >= issue.consensusThreshold) {
    issue.active = false;
    issue.currentStage = "finished";
    await issue.save();

    return {
      finished: true,
      message: `Issue '${issue.name}' resolved: consensus threshold ${issue.consensusThreshold} reached.`,
      rankedAlternatives: rankedWithScores,
    };
  }

  await Participation.updateMany(
    { issue: issue._id },
    { $set: { evaluationCompleted: false } }
  );

  return {
    finished: false,
    message: `Issue '${issue.name}' consensus threshold not reached. Another round is needed.`,
  };
};
