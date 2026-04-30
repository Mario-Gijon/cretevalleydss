import { createInternalError } from "../../../../utils/common/errors.js";

const buildAlternativeNames = (alternatives) =>
  (alternatives || []).map((alternative) => alternative?.name);

const buildPlotsGraphicWithEmails = (participations, plotsGraphic) => {
  if (!plotsGraphic?.expert_points || !Array.isArray(plotsGraphic.expert_points)) {
    return null;
  }

  const expertPointsMap = {};

  (participations || []).forEach((participation, index) => {
    expertPointsMap[participation.expert.email] =
      plotsGraphic.expert_points[index] ?? null;
  });

  return {
    expert_points: expertPointsMap,
    collective_point: plotsGraphic.collective_point ?? null,
  };
};

const buildCollectiveScoresByName = (alternativeNames, scores) => {
  const collectiveScoresByName = {};

  (scores || []).forEach((score, index) => {
    collectiveScoresByName[alternativeNames[index]] = score;
  });

  return collectiveScoresByName;
};

const normalizeRankingOutput = ({
  rawOutput,
  alternatives,
  criteria,
  participations,
  issue,
}) => {
  const alternativeNames = buildAlternativeNames(alternatives);

  const rankedAlternatives = (rawOutput?.collective_ranking || []).map(
    (index) => alternativeNames[index]
  );

  const rankedWithScores = (rawOutput?.collective_ranking || []).map((index) => ({
    name: alternativeNames[index],
    score: rawOutput?.collective_scores?.[index] ?? null,
  }));

  const collectiveScoresByName = buildCollectiveScoresByName(
    alternativeNames,
    rawOutput?.collective_scores
  );

  const collectiveEvaluations = {};
  (rawOutput?.collective_matrix || []).forEach((row, alternativeIndex) => {
    const alternativeName = alternativeNames[alternativeIndex];
    collectiveEvaluations[alternativeName] = {};

    row.forEach((value, criterionIndex) => {
      const criterionName = criteria?.[criterionIndex]?.name;
      if (!criterionName) return;
      collectiveEvaluations[alternativeName][criterionName] = { value };
    });
  });

  return {
    rankedAlternatives,
    rankedWithScores,
    collectiveScoresByName,
    collectiveRanking: rankedAlternatives,
    collectiveEvaluations,
    consensusLevel: issue?.isConsensus ? rawOutput?.cm ?? 0 : null,
    plotsGraphic: buildPlotsGraphicWithEmails(participations, rawOutput?.plots_graphic),
  };
};

const normalizeConsensusRankingOutput = ({
  rawOutput,
  alternatives,
  criteria,
  participations,
}) => {
  const alternativeNames = buildAlternativeNames(alternatives);

  const rankedWithScores = (rawOutput?.alternatives_rankings || []).map((index) => ({
    name: alternativeNames[index],
    score: rawOutput?.collective_scores?.[index] ?? null,
  }));

  const transformedCollectiveEvaluations = {};

  for (const criterion of criteria || []) {
    const matrix = rawOutput?.collective_evaluations?.[criterion.name];
    if (!matrix) continue;

    transformedCollectiveEvaluations[criterion.name] = matrix.map((row, rowIndex) => {
      const formattedRow = { id: alternatives?.[rowIndex]?.name };

      row.forEach((value, colIndex) => {
        formattedRow[alternatives?.[colIndex]?.name] = value;
      });

      return formattedRow;
    });
  }

  const collectiveScoresByName = Object.fromEntries(
    alternativeNames.map((name, index) => [
      name,
      rawOutput?.collective_scores?.[index] ?? null,
    ])
  );

  return {
    rankedAlternatives: rankedWithScores.map((item) => item.name),
    rankedWithScores,
    collectiveScoresByName,
    collectiveRanking: rankedWithScores.map((item) => item.name),
    collectiveEvaluations: transformedCollectiveEvaluations,
    consensusLevel: rawOutput?.cm ?? 0,
    plotsGraphic: buildPlotsGraphicWithEmails(participations, rawOutput?.plots_graphic),
  };
};

const OUTPUT_NORMALIZERS_BY_KIND = {
  ranking: normalizeRankingOutput,
  consensusRanking: normalizeConsensusRankingOutput,
};

/**
 * Normaliza la salida de ApiModels según el tipo de output declarado por el modelo.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string|null|undefined} params.outputKind Tipo de salida publicada por ApiModels.
 * @param {Object} params.rawOutput Payload desempaquetado devuelto por ApiModels.
 * @param {Array<Object>} params.alternatives Alternativas ordenadas.
 * @param {Array<Object>} params.criteria Criterios hoja ordenados.
 * @param {Array<Object>} [params.participations=[]] Participaciones aceptadas.
 * @param {Object} [params.issue] Issue actual (si aplica).
 * @param {Object} [params.model] Modelo del issue.
 * @param {"direct"|"pairwise"|null} [params.resolutionMode=null] Modo de resolución actual.
 * @returns {Object}
 */
export const normalizeModelOutput = ({
  outputKind,
  rawOutput,
  alternatives,
  criteria,
  participations = [],
  issue,
  model,
  resolutionMode = null,
}) => {
  const normalizedOutputKind = String(outputKind || "").trim();

  const normalizeByOutputKind = OUTPUT_NORMALIZERS_BY_KIND[normalizedOutputKind];
  if (normalizeByOutputKind) {
    return normalizeByOutputKind({
      rawOutput,
      alternatives,
      criteria,
      participations,
      issue,
    });
  }

  if (resolutionMode === "direct") {
    return normalizeRankingOutput({
      rawOutput,
      alternatives,
      criteria,
      participations,
      issue,
    });
  }

  if (resolutionMode === "pairwise") {
    return normalizeConsensusRankingOutput({
      rawOutput,
      alternatives,
      criteria,
      participations,
    });
  }

  throw createInternalError(
    `Unsupported model output kind: ${String(outputKind)} for model ${String(model?.name || "unknown")}`
  );
};
