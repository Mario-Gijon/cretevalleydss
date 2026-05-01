import { createInternalError } from "../../../../utils/common/errors.js";

const buildAlternativeNames = (alternatives) =>
  (alternatives || []).map((alternative) => alternative?.name);

const getValueType = (value) => {
  if (Array.isArray(value)) return "array";
  if (value === null) return "null";
  return typeof value;
};

const throwInvalidModelOutputField = ({
  outputKind,
  model,
  field,
  message,
  value,
}) => {
  throw createInternalError(
    `Invalid ApiModels output for outputKind '${outputKind}' in model '${String(model?.name || "unknown")}': ${field} ${message}.`,
    {
      field: `rawOutput.${field}`,
      details: {
        outputKind,
        model: model?.name ?? null,
        field,
        message,
        receivedType: getValueType(value),
      },
    }
  );
};

const requireRankingIndexes = ({
  rawOutput,
  rankingField,
  alternativeCount,
  outputKind,
  model,
}) => {
  const rankingIndexes = rawOutput?.[rankingField];

  if (!Array.isArray(rankingIndexes)) {
    throwInvalidModelOutputField({
      outputKind,
      model,
      field: rankingField,
      message: "must be an array of alternative indexes",
      value: rankingIndexes,
    });
  }

  if (rankingIndexes.length !== alternativeCount) {
    throwInvalidModelOutputField({
      outputKind,
      model,
      field: rankingField,
      message: `must contain exactly ${alternativeCount} indexes`,
      value: rankingIndexes,
    });
  }

  const seenIndexes = new Set();

  rankingIndexes.forEach((index, position) => {
    if (!Number.isInteger(index)) {
      throwInvalidModelOutputField({
        outputKind,
        model,
        field: `${rankingField}[${position}]`,
        message: "must be an integer index",
        value: index,
      });
    }

    if (index < 0 || index >= alternativeCount) {
      throwInvalidModelOutputField({
        outputKind,
        model,
        field: `${rankingField}[${position}]`,
        message: `is out of bounds for ${alternativeCount} alternatives`,
        value: index,
      });
    }

    if (seenIndexes.has(index)) {
      throwInvalidModelOutputField({
        outputKind,
        model,
        field: `${rankingField}[${position}]`,
        message: "contains a duplicate index",
        value: index,
      });
    }

    seenIndexes.add(index);
  });

  return rankingIndexes;
};

const requireCollectiveScores = ({
  rawOutput,
  alternativeCount,
  outputKind,
  model,
}) => {
  const collectiveScores = rawOutput?.collective_scores;

  if (!Array.isArray(collectiveScores)) {
    throwInvalidModelOutputField({
      outputKind,
      model,
      field: "collective_scores",
      message: "must be an array of scores",
      value: collectiveScores,
    });
  }

  if (collectiveScores.length !== alternativeCount) {
    throwInvalidModelOutputField({
      outputKind,
      model,
      field: "collective_scores",
      message: `must contain exactly ${alternativeCount} scores`,
      value: collectiveScores,
    });
  }

  collectiveScores.forEach((score, index) => {
    if (typeof score !== "number" || !Number.isFinite(score)) {
      throwInvalidModelOutputField({
        outputKind,
        model,
        field: `collective_scores[${index}]`,
        message: "must be a finite number",
        value: score,
      });
    }
  });

  return collectiveScores;
};

const requireConsensusLevel = ({ rawOutput, outputKind, model }) => {
  const consensusLevel = rawOutput?.cm;

  if (typeof consensusLevel !== "number" || !Number.isFinite(consensusLevel)) {
    throwInvalidModelOutputField({
      outputKind,
      model,
      field: "cm",
      message: "must be a finite number",
      value: consensusLevel,
    });
  }

  return consensusLevel;
};

const extractRequiredRankingData = ({
  rawOutput,
  rankingField,
  alternativeCount,
  outputKind,
  model,
}) => {
  const rankingIndexes = requireRankingIndexes({
    rawOutput,
    rankingField,
    alternativeCount,
    outputKind,
    model,
  });

  const collectiveScores = requireCollectiveScores({
    rawOutput,
    alternativeCount,
    outputKind,
    model,
  });

  return {
    rankingIndexes,
    collectiveScores,
  };
};

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

  alternativeNames.forEach((name, index) => {
    collectiveScoresByName[name] = scores[index];
  });

  return collectiveScoresByName;
};

const normalizeRankingOutput = ({
  rawOutput,
  alternatives,
  criteria,
  participations,
  issue,
  model,
}) => {
  const outputKind = "ranking";
  const alternativeNames = buildAlternativeNames(alternatives);
  const { rankingIndexes, collectiveScores } = extractRequiredRankingData({
    rawOutput,
    rankingField: "collective_ranking",
    alternativeCount: alternativeNames.length,
    outputKind,
    model,
  });

  const rankedAlternatives = rankingIndexes.map(
    (index) => alternativeNames[index]
  );

  const rankedWithScores = rankingIndexes.map((index) => ({
    name: alternativeNames[index],
    score: collectiveScores[index],
  }));

  const collectiveScoresByName = buildCollectiveScoresByName(
    alternativeNames,
    collectiveScores
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
    consensusLevel: issue?.isConsensus
      ? requireConsensusLevel({ rawOutput, outputKind, model })
      : null,
    plotsGraphic: buildPlotsGraphicWithEmails(participations, rawOutput?.plots_graphic),
  };
};

const normalizeConsensusRankingOutput = ({
  rawOutput,
  alternatives,
  criteria,
  participations,
  model,
}) => {
  const outputKind = "consensusRanking";
  const alternativeNames = buildAlternativeNames(alternatives);
  const { rankingIndexes, collectiveScores } = extractRequiredRankingData({
    rawOutput,
    rankingField: "alternatives_rankings",
    alternativeCount: alternativeNames.length,
    outputKind,
    model,
  });

  const rankedWithScores = rankingIndexes.map((index) => ({
    name: alternativeNames[index],
    score: collectiveScores[index],
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

  const collectiveScoresByName = buildCollectiveScoresByName(
    alternativeNames,
    collectiveScores
  );

  return {
    rankedAlternatives: rankedWithScores.map((item) => item.name),
    rankedWithScores,
    collectiveScoresByName,
    collectiveRanking: rankedWithScores.map((item) => item.name),
    collectiveEvaluations: transformedCollectiveEvaluations,
    consensusLevel: requireConsensusLevel({ rawOutput, outputKind, model }),
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
      model,
    });
  }

  throw createInternalError(
    `Unsupported model output kind: ${String(outputKind)} for model ${String(model?.name || "unknown")}`
  );
};
