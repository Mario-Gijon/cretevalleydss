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
const buildModelExecutionDetails = ({
  model,
  modelKey,
  modelParameters,
  rawOutput,
}) => {
  return {
    apiModelKey: model?.apiModelKey ?? modelKey ?? null,
    modelKey: modelKey ?? null,
    modelName: model?.name ?? null,
    inputKind: model?.inputKind ?? null,
    outputKind: model?.outputKind ?? null,
    apiEndpoint: model?.apiEndpoint ?? null,
    apiEndpointPath: model?.apiEndpoint?.path ?? null,
    modelParameters: modelParameters ?? null,
    executedAt: new Date(),
    rawOutput,
  };
};

/**
 * Construye la información persistible y de respuesta para una resolución.
 *
 * @param {object} params Parámetros de entrada.
 * @param {Object} params.results Resultado devuelto por el modelo.
 * @param {Array<Object>} params.alternatives Alternativas ordenadas.
 * @param {Array<Object>} params.criteria Criterios hoja ordenados.
 * @param {Object} params.matrices Matrices usadas por la resolución.
 * @param {Array<Object>} params.participations Participaciones aceptadas.
 * @param {Object|null} [params.issue=null] Issue actual.
 * @param {Object} params.model Modelo del issue.
 * @param {string|null} params.modelKey Clave del endpoint resuelto.
 * @param {Object} params.modelParameters Parámetros efectivos enviados al modelo.
 * @param {Object} params.rawOutput Payload crudo devuelto por ApiModels.
 * @returns {Object}
 */
export const buildResolutionResult = ({
  results,
  alternatives,
  criteria,
  matrices,
  participations,
  issue = null,
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
