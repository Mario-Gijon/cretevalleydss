import { Evaluation } from "../models/Evaluations.js";
import { IssueExpressionDomain } from "../models/IssueExpressionDomains.js";

/**
 * Obtiene la clave de endpoint asociada a un modelo.
 *
 * @param {string} [modelName] Nombre del modelo.
 * @returns {string|null}
 */
export const getModelEndpointKey = (modelName = "") => {
  const normalizedName = String(modelName).trim().toUpperCase();

  if (normalizedName === "TOPSIS") return "topsis";
  if (normalizedName === "FUZZY TOPSIS") return "fuzzy_topsis";
  if (normalizedName === "BORDA") return "borda";
  if (normalizedName === "ARAS") return "aras";

  if (
    normalizedName === "HERRERA-VIEDMA CRP" ||
    normalizedName === "HERRERA VIEDMA CRP" ||
    normalizedName === "CRP"
  ) {
    return "herrera_viedma_crp";
  }

  return null;
};

/**
 * Detecta el tipo de dominio usado en un issue a partir de los snapshots utilizados.
 *
 * @param {Object} params Datos de entrada.
 * @param {string|Object} params.issueId Id del issue.
 * @param {Array<string|Object>} params.expertIds Ids de expertos.
 * @returns {Promise<{ domainType: string, snapshotIdsUsed: Array<*> }>}
 */
export const detectIssueDomainTypeOrThrow = async ({ issueId, expertIds }) => {
  const snapshotIds = await Evaluation.distinct("expressionDomain", {
    issue: issueId,
    expert: { $in: expertIds },
  });

  const snapshots = await IssueExpressionDomain.find(
    { _id: { $in: snapshotIds }, issue: issueId },
    "type"
  ).lean();

  const types = new Set(snapshots.map((snapshot) => snapshot.type).filter(Boolean));

  if (types.size === 0) {
    const error = new Error("Cannot detect issue domain type (no snapshots found in evaluations).");
    error.status = 400;
    throw error;
  }

  if (types.size > 1) {
    const error = new Error(
      "This issue mixes numeric and linguistic domains. Simulation is disabled for now."
    );
    error.status = 400;
    throw error;
  }

  return {
    domainType: Array.from(types)[0],
    snapshotIdsUsed: snapshotIds,
  };
};

/**
 * Valida los pesos usados por un modelo destino.
 *
 * @param {Object} params Datos de entrada.
 * @param {Object} params.targetModel Modelo destino.
 * @param {Object} params.paramsUsed Parámetros usados.
 * @param {number} params.criteriaLen Número de criterios hoja.
 * @returns {void}
 */
export const validateWeightsForTargetModel = ({ targetModel, paramsUsed, criteriaLen }) => {
  const weightsParam = (targetModel?.parameters || []).find((parameter) => parameter?.name === "weights");
  if (!weightsParam) return;

  const weights = paramsUsed?.weights;

  if (weights == null) {
    const error = new Error("Target model requires 'weights' but none were provided.");
    error.status = 400;
    throw error;
  }

  if (!Array.isArray(weights)) {
    const error = new Error("'weights' must be an array.");
    error.status = 400;
    throw error;
  }

  if (weights.length !== criteriaLen) {
    const error = new Error(`'weights' length must match number of leaf criteria (${criteriaLen}).`);
    error.status = 400;
    throw error;
  }

  if (weightsParam.type === "array") {
    const isValid = weights.every((value) => typeof value === "number" && Number.isFinite(value));

    if (!isValid) {
      const error = new Error("Target model expects crisp numeric weights (array of numbers).");
      error.status = 400;
      throw error;
    }

    return;
  }

  if (weightsParam.type === "fuzzyArray") {
    const isValid = weights.every((value) => {
      if (Array.isArray(value)) {
        return value.length === 3 && value.every((n) => typeof n === "number" && Number.isFinite(n));
      }

      if (value && typeof value === "object") {
        return true;
      }

      return false;
    });

    if (!isValid) {
      const error = new Error(
        "Target model expects fuzzy weights (each weight must be [l,m,u] or an object)."
      );
      error.status = 400;
      throw error;
    }
  }
};

/**
 * Construye matrices alternativas x criterios.
 *
 * @param {Object} params Datos de entrada.
 * @returns {Promise<{ matrices: Object, expertsOrder: Array<string>, snapshotIdsUsed: Array<string> }>}
 */
export const buildAxCMatrices = async ({ issueId, alternatives, criteria, participations }) => {
  const expertIds = participations.map((participation) => participation.expert._id);

  const evaluationDocs = await Evaluation.find({
    issue: issueId,
    expert: { $in: expertIds },
    comparedAlternative: null,
  })
    .populate("expressionDomain")
    .lean();

  const evaluationsMap = new Map();
  const snapshotIdsUsed = new Set();

  for (const evaluation of evaluationDocs) {
    const key = `${String(evaluation.expert)}_${String(evaluation.alternative)}_${String(evaluation.criterion)}`;
    evaluationsMap.set(key, evaluation);

    if (evaluation.expressionDomain?._id) {
      snapshotIdsUsed.add(String(evaluation.expressionDomain._id));
    }
  }

  const expertsOrder = participations.map((participation) => participation.expert.email);
  const matrices = {};

  for (const participation of participations) {
    const expertEmail = participation.expert.email;
    const matrix = [];

    for (const alternative of alternatives) {
      const row = [];

      for (const criterion of criteria) {
        const key = `${String(participation.expert._id)}_${String(alternative._id)}_${String(criterion._id)}`;
        const evaluation = evaluationsMap.get(key);

        if (!evaluation) {
          const error = new Error(
            `Missing evaluation for expert ${expertEmail}, alt ${alternative.name}, crit ${criterion.name}`
          );
          error.status = 400;
          throw error;
        }

        let value = evaluation.value ?? null;
        const domain = evaluation.expressionDomain;

        if (domain?.type === "linguistic") {
          const labelDefinition = (domain.linguisticLabels || []).find((label) => label.label === value);
          value = labelDefinition ? labelDefinition.values : null;
        }

        row.push(value);
      }

      matrix.push(row);
    }

    matrices[expertEmail] = matrix;
  }

  return {
    matrices,
    expertsOrder,
    snapshotIdsUsed: Array.from(snapshotIdsUsed),
  };
};

/**
 * Construye matrices pairwise agrupadas por experto y criterio.
 *
 * @param {Object} params Datos de entrada.
 * @returns {Promise<{ matrices: Object, expertsOrder: Array<string>, snapshotIdsUsed: Array<string> }>}
 */
export const buildPairwiseMatrices = async ({ issueId, alternatives, criteria, participations }) => {
  const expertIds = participations.map((participation) => participation.expert._id);

  const evaluationDocs = await Evaluation.find({
    issue: issueId,
    expert: { $in: expertIds },
    comparedAlternative: { $ne: null },
  })
    .populate("expressionDomain")
    .lean();

  const evaluationsMap = new Map();
  const snapshotIdsUsed = new Set();

  for (const evaluation of evaluationDocs) {
    const key = `${String(evaluation.expert)}_${String(evaluation.criterion)}_${String(
      evaluation.alternative
    )}_${String(evaluation.comparedAlternative)}`;

    evaluationsMap.set(key, evaluation);

    if (evaluation.expressionDomain?._id) {
      snapshotIdsUsed.add(String(evaluation.expressionDomain._id));
    }
  }

  const expertsOrder = participations.map((participation) => participation.expert.email);
  const alternativeIndexMap = new Map(
    alternatives.map((alternative, index) => [String(alternative._id), index])
  );

  const matrices = {};

  for (const participation of participations) {
    const expertEmail = participation.expert.email;
    matrices[expertEmail] = {};

    for (const criterion of criteria) {
      const size = alternatives.length;
      const matrix = Array.from({ length: size }, (_, rowIndex) =>
        Array.from({ length: size }, (_, colIndex) => (rowIndex === colIndex ? 0.5 : null))
      );

      for (const alternative of alternatives) {
        for (const comparedAlternative of alternatives) {
          if (String(alternative._id) === String(comparedAlternative._id)) continue;

          const key = `${String(participation.expert._id)}_${String(criterion._id)}_${String(
            alternative._id
          )}_${String(comparedAlternative._id)}`;

          const evaluation = evaluationsMap.get(key);
          if (!evaluation) continue;

          const rowIndex = alternativeIndexMap.get(String(alternative._id));
          const colIndex = alternativeIndexMap.get(String(comparedAlternative._id));

          if (rowIndex == null || colIndex == null) continue;

          matrix[rowIndex][colIndex] = evaluation.value ?? null;
        }
      }

      for (let i = 0; i < size; i += 1) {
        for (let j = 0; j < size; j += 1) {
          if (i === j) continue;

          if (matrix[i][j] == null) {
            const error = new Error(
              `Incomplete pairwise matrix for expert ${expertEmail}, criterion ${criterion.name}`
            );
            error.status = 400;
            throw error;
          }
        }
      }

      matrices[expertEmail][criterion.name] = matrix;
    }
  }

  return {
    matrices,
    expertsOrder,
    snapshotIdsUsed: Array.from(snapshotIdsUsed),
  };
};

/**
 * Normaliza resultados de simulación a una estructura común.
 *
 * @param {Object} params Datos de entrada.
 * @returns {{ details: Object, collectiveEvaluations: Object }}
 */
export const normalizeScenarioResults = ({
  targetModelName,
  apiResults,
  alternatives,
  criteria,
  expertsOrder,
}) => {
  const normalizedModelName = String(targetModelName || "").trim().toUpperCase();
  const alternativeNames = alternatives.map((alternative) => alternative.name);

  if (normalizedModelName === "HERRERA VIEDMA CRP") {
    const {
      alternatives_rankings = [],
      cm = null,
      collective_evaluations = {},
      plots_graphic = null,
      collective_scores = [],
    } = apiResults || {};

    const rankedWithScores = alternatives_rankings.map((index) => ({
      name: alternativeNames[index],
      score: collective_scores?.[index] ?? null,
    }));

    const collectiveScoresByName = Object.fromEntries(
      alternativeNames.map((name, index) => [name, collective_scores?.[index] ?? null])
    );

    const transformedCollectiveEvaluations = {};

    for (const criterion of criteria) {
      const matrix = collective_evaluations?.[criterion.name];
      if (!matrix) continue;

      transformedCollectiveEvaluations[criterion.name] = matrix.map((row, rowIndex) => {
        const rowObject = { id: alternativeNames[rowIndex] };

        row.forEach((value, colIndex) => {
          rowObject[alternativeNames[colIndex]] = value;
        });

        return rowObject;
      });
    }

    let plotsGraphicWithEmails = null;

    if (plots_graphic?.expert_points && Array.isArray(plots_graphic.expert_points)) {
      const expertPointsMap = {};

      expertsOrder.forEach((email, index) => {
        expertPointsMap[email] = plots_graphic.expert_points[index] ?? null;
      });

      plotsGraphicWithEmails = {
        expert_points: expertPointsMap,
        collective_point: plots_graphic.collective_point ?? null,
      };
    }

    const details = {
      cm,
      rankedAlternatives: rankedWithScores,
      collective_scores: collectiveScoresByName,
      collective_ranking: rankedWithScores.map((item) => item.name),
      ...(plotsGraphicWithEmails ? { plotsGraphic: plotsGraphicWithEmails } : {}),
    };

    return {
      details,
      collectiveEvaluations: transformedCollectiveEvaluations,
    };
  }

  const {
    collective_ranking = [],
    collective_scores = [],
    collective_matrix = null,
    plots_graphic = null,
    cm = null,
  } = apiResults || {};

  const rankedWithScores = collective_ranking.map((index) => ({
    name: alternativeNames[index],
    score: collective_scores?.[index] ?? null,
  }));

  const collectiveScoresByName = Object.fromEntries(
    alternativeNames.map((name, index) => [name, collective_scores?.[index] ?? null])
  );

  const collectiveEvaluations = {};

  if (Array.isArray(collective_matrix)) {
    collective_matrix.forEach((row, alternativeIndex) => {
      const alternativeName = alternativeNames[alternativeIndex];
      collectiveEvaluations[alternativeName] = {};

      row.forEach((value, criterionIndex) => {
        const criterionName = criteria[criterionIndex]?.name ?? `C${criterionIndex + 1}`;
        collectiveEvaluations[alternativeName][criterionName] = { value };
      });
    });
  }

  let plotsGraphicWithEmails = null;

  if (plots_graphic?.expert_points && Array.isArray(plots_graphic.expert_points)) {
    const expertPointsMap = {};

    expertsOrder.forEach((email, index) => {
      expertPointsMap[email] = plots_graphic.expert_points[index] ?? null;
    });

    plotsGraphicWithEmails = {
      expert_points: expertPointsMap,
      collective_point: plots_graphic.collective_point ?? null,
    };
  }

  const details = {
    cm,
    rankedAlternatives: rankedWithScores,
    collective_scores: collectiveScoresByName,
    collective_ranking: rankedWithScores.map((item) => item.name),
    ...(plotsGraphicWithEmails ? { plotsGraphic: plotsGraphicWithEmails } : {}),
  };

  return { details, collectiveEvaluations };
};

const toNum = (value) => (Number.isFinite(Number(value)) ? Number(value) : null);

const pickMid = (weight) => {
  if (Array.isArray(weight) && weight.length === 3) return toNum(weight[1]);
  if (weight && typeof weight === "object") return toNum(weight.m ?? weight.mid ?? weight.value);
  return toNum(weight);
};

const toTriple = (weight) => {
  if (Array.isArray(weight) && weight.length === 3) return weight.map(toNum);
  if (weight && typeof weight === "object") return [toNum(weight.l), toNum(weight.m), toNum(weight.u)];

  const numericValue = toNum(weight);
  return [numericValue, numericValue, numericValue];
};

const normalizeCrisp = (values) => {
  const sum = values.reduce((accumulator, value) => accumulator + value, 0);
  if (!sum) return values;
  return values.map((value) => value / sum);
};

const normalizeFuzzyByMid = (triples) => {
  const mids = triples.map((triple) => triple?.[1]).filter(Number.isFinite);
  const sum = mids.reduce((accumulator, value) => accumulator + value, 0);
  if (!sum) return triples;

  const factor = 1 / sum;
  return triples.map(([l, m, u]) => [l * factor, m * factor, u * factor]);
};

/**
 * Adapta pesos base al tipo de pesos del modelo destino.
 *
 * @param {Object} params Datos de entrada.
 * @returns {*}
 */
export const coerceWeightsForModel = ({ baseWeights, weightsParam, leafCount }) => {
  const totalLeaves =
    Number(leafCount) || (Array.isArray(baseWeights) ? baseWeights.length : 1);

  if (weightsParam.type === "array") {
    const crispWeights = Array.from({ length: totalLeaves }, (_, index) =>
      pickMid(baseWeights?.[index])
    );

    if (crispWeights.some((value) => !Number.isFinite(value))) {
      throw new Error("Invalid base weights");
    }

    return normalizeCrisp(crispWeights);
  }

  if (weightsParam.type === "fuzzyArray") {
    const fuzzyWeights = Array.from({ length: totalLeaves }, (_, index) =>
      toTriple(baseWeights?.[index])
    );

    if (fuzzyWeights.some((triple) => triple.some((value) => !Number.isFinite(value)))) {
      throw new Error("Invalid base fuzzy weights");
    }

    return normalizeFuzzyByMid(fuzzyWeights);
  }

  return baseWeights;
};