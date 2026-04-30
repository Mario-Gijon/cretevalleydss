import { normalizeModelOutput } from "./modelOutputs/modelOutput.adapters.js";

/**
 * Construye metadatos de ejecución del modelo para persistencia de salida cruda.
 *
 * @param {object} params Parámetros de entrada.
 * @param {Object} params.model Modelo del issue.
 * @param {string|null} params.modelKey Clave del endpoint resuelto.
 * @param {Object} params.modelParameters Parámetros efectivos enviados al modelo.
 * @param {Object} params.rawOutput Payload crudo devuelto por ApiModels (ya desempaquetado).
 * @returns {Object}
 */
export const buildModelExecutionDetails = ({
  model,
  modelKey,
  modelParameters,
  rawOutput,
}) => {
  return {
    modelKey: modelKey ?? null,
    modelName: model?.name ?? null,
    inputKind: model?.inputKind ?? null,
    outputKind: model?.outputKind ?? null,
    apiEndpoint: model?.apiEndpoint?.path ?? null,
    modelParameters: modelParameters ?? null,
    executedAt: new Date(),
    rawOutput,
  };
};

/**
 * Construye la información persistible y de respuesta para una resolución directa.
 *
 * @param {object} params Parámetros de entrada.
 * @param {Object} params.results Resultado devuelto por el modelo.
 * @param {Array<Object>} params.alternatives Alternativas ordenadas.
 * @param {Array<Object>} params.criteria Criterios hoja ordenados.
 * @param {Object} params.matrices Matrices por experto.
 * @param {Array<Object>} params.participations Participaciones aceptadas.
 * @param {Object} params.issue Issue actual.
 * @param {Object} params.model Modelo del issue.
 * @param {string|null} params.modelKey Clave del endpoint resuelto.
 * @param {Object} params.modelParameters Parámetros efectivos enviados al modelo.
 * @param {Object} params.rawOutput Payload crudo devuelto por ApiModels.
 * @returns {Object}
 */
export const buildDirectResolutionResult = ({
  results,
  alternatives,
  criteria,
  matrices,
  participations,
  issue,
  model,
  modelKey,
  modelParameters,
  rawOutput,
}) => {
  const normalizedOutput = normalizeModelOutput({
    outputKind: model?.outputKind,
    rawOutput: results,
    alternatives,
    criteria,
    participations,
    issue,
    model,
    resolutionMode: "direct",
  });

  const modelExecution = buildModelExecutionDetails({
    model,
    modelKey,
    modelParameters,
    rawOutput,
  });

  return {
    rankedAlternatives: normalizedOutput.rankedAlternatives,
    rankedWithScores: normalizedOutput.rankedWithScores,
    collectiveEvaluations: normalizedOutput.collectiveEvaluations,
    consensusDetails: {
      rankedAlternatives: normalizedOutput.rankedWithScores,
      matrices,
      collective_scores: normalizedOutput.collectiveScoresByName,
      collective_ranking: normalizedOutput.collectiveRanking,
      ...(normalizedOutput.plotsGraphic
        ? { plotsGraphic: normalizedOutput.plotsGraphic }
        : {}),
      modelExecution,
    },
    consensusLevel: normalizedOutput.consensusLevel,
  };
};

/**
 * Construye la información persistible y de respuesta para una resolución pairwise.
 *
 * @param {object} params Parámetros de entrada.
 * @param {Object} params.results Resultado devuelto por el modelo.
 * @param {Array<Object>} params.alternatives Alternativas ordenadas.
 * @param {Array<Object>} params.criteria Criterios hoja ordenados.
 * @param {Object} params.matrices Matrices por experto y criterio.
 * @param {Array<Object>} params.participations Participaciones aceptadas.
 * @param {Object} params.model Modelo del issue.
 * @param {string|null} params.modelKey Clave del endpoint resuelto.
 * @param {Object} params.modelParameters Parámetros efectivos enviados al modelo.
 * @param {Object} params.rawOutput Payload crudo devuelto por ApiModels.
 * @returns {Object}
 */
export const buildPairwiseResolutionResult = ({
  results,
  alternatives,
  criteria,
  matrices,
  participations,
  model,
  modelKey,
  modelParameters,
  rawOutput,
}) => {
  const normalizedOutput = normalizeModelOutput({
    outputKind: model?.outputKind,
    rawOutput: results,
    alternatives,
    criteria,
    participations,
    issue: null,
    model,
    resolutionMode: "pairwise",
  });

  const modelExecution = buildModelExecutionDetails({
    model,
    modelKey,
    modelParameters,
    rawOutput,
  });

  return {
    rankedWithScores: normalizedOutput.rankedWithScores,
    collectiveEvaluations: normalizedOutput.collectiveEvaluations,
    consensusDetails: {
      rankedAlternatives: normalizedOutput.rankedWithScores,
      matrices,
      collective_scores: normalizedOutput.collectiveScoresByName,
      collective_ranking: normalizedOutput.collectiveRanking,
      ...(normalizedOutput.plotsGraphic
        ? { plotsGraphic: normalizedOutput.plotsGraphic }
        : {}),
      modelExecution,
    },
    consensusLevel: normalizedOutput.consensusLevel,
  };
};
