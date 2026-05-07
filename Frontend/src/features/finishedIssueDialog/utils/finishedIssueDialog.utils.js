import { extractLeafCriteria } from "../../issueAlternativeEvaluation/shared/leafCriteria.utils";
import {
  isCriteriaWeightsParameter,
  resolveLeafLengthForParameter,
  resolveParameterKey,
} from "../../modelParameters";

const countLeafCriteria = (nodes) => {
  if (!Array.isArray(nodes) || nodes.length === 0) return 0;

  let count = 0;
  const stack = [...nodes];

  while (stack.length) {
    const node = stack.pop();
    if (!node) continue;

    const children = Array.isArray(node.children) ? node.children : [];
    if (children.length === 0) {
      count += 1;
    } else {
      stack.push(...children);
    }
  }

  return count;
};

/**
 * Obtiene el numero de criterios hoja del issue.
 *
 * @param {Object} source Datos del issue.
 * @returns {number}
 */
export const getLeafCriteriaCountFromIssue = (source) => {
  if (Array.isArray(source?.modelParams?.leafCriteria)) {
    return source.modelParams.leafCriteria.length;
  }

  if (Array.isArray(source?.modelParams?.base?.leafCriteria)) {
    return source.modelParams.base.leafCriteria.length;
  }

  if (Array.isArray(source?.summary?.criteria)) {
    return countLeafCriteria(source.summary.criteria);
  }

  if (Array.isArray(source?.criteria)) {
    return countLeafCriteria(source.criteria);
  }

  return 0;
};

/**
 * Indica si el issue tiene un unico criterio hoja.
 *
 * @param {Object} source Datos del issue.
 * @returns {boolean}
 */
export const hasSingleLeafCriterion = (source) =>
  getLeafCriteriaCountFromIssue(source) === 1;

/**
 * Stringify seguro para visualizar parametros.
 *
 * @param {*} value Valor a serializar.
 * @returns {string}
 */
export const safeJsonStringify = (value) => {
  try {
    if (value === null || value === undefined) return "";
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) return "";
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        return JSON.stringify(JSON.parse(trimmed), null, 2);
      }
      return value;
    }

    return JSON.stringify(value, null, 2);
  } catch {
    return typeof value === "string" ? value : String(value);
  }
};

/**
 * Devuelve el ultimo indice de fase disponible en ratings.
 *
 * @param {Object} issueInfo Datos del issue.
 * @returns {number}
 */
export const getLastPhaseIndex = (issueInfo) => {
  const phaseFromRounds = (rounds = []) => {
    const phases = rounds
      .map((round) => Number(round?.phase))
      .filter((phase) => Number.isInteger(phase) && phase > 0);
    if (phases.length === 0) return null;
    return Math.max(...phases);
  };

  const historyPhase = phaseFromRounds(
    Array.isArray(issueInfo?.consensusHistory) ? issueInfo.consensusHistory : []
  );
  if (historyPhase) return historyPhase - 1;

  const roundsPhase = phaseFromRounds(
    Array.isArray(issueInfo?.consensusRounds) ? issueInfo.consensusRounds : []
  );
  if (roundsPhase) return roundsPhase - 1;

  const consensusPhase = phaseFromRounds(
    Array.isArray(issueInfo?.consensus) ? issueInfo.consensus : []
  );
  if (consensusPhase) return consensusPhase - 1;

  const keys = Object.keys(issueInfo?.expertsRatings || {})
    .map((key) => parseInt(key, 10))
    .filter((key) => !Number.isNaN(key));

  const last = Math.max(...keys, 0) - 1;
  return Math.max(0, last);
};

/**
 * Calcula el numero de rondas del issue.
 *
 * @param {Object} issueInfo Datos del issue.
 * @returns {number}
 */
export const getRoundsCount = (issueInfo) => {
  const phaseFromRounds = (rounds = []) => {
    const phases = rounds
      .map((round) => Number(round?.phase))
      .filter((phase) => Number.isInteger(phase) && phase > 0);
    if (phases.length === 0) return null;
    return Math.max(...phases);
  };

  const historyPhase = phaseFromRounds(
    Array.isArray(issueInfo?.consensusHistory) ? issueInfo.consensusHistory : []
  );
  if (historyPhase) return historyPhase;

  const roundsPhase = phaseFromRounds(
    Array.isArray(issueInfo?.consensusRounds) ? issueInfo.consensusRounds : []
  );
  if (roundsPhase) return roundsPhase;

  const consensusPhase = phaseFromRounds(
    Array.isArray(issueInfo?.consensus) ? issueInfo.consensus : []
  );
  if (consensusPhase) return consensusPhase;

  const fromConsensus = issueInfo?.summary?.consensusInfo?.consensusReachedPhase;
  if (typeof fromConsensus === "number" && fromConsensus > 0) return fromConsensus;

  const keys = Object.keys(issueInfo?.expertsRatings || {})
    .map((key) => parseInt(key, 10))
    .filter((key) => !Number.isNaN(key));

  const derived = Math.max(...keys, 0);
  if (derived > 0) return derived;

  const rankings = issueInfo?.alternativesRankings;
  if (Array.isArray(rankings) && rankings.length) return rankings.length;

  return 0;
};

/**
 * Clona objeto de parametros en superficie.
 *
 * @param {Object} obj Parametros base.
 * @returns {Object}
 */
export const stripWeights = (obj) => {
  if (!obj || typeof obj !== "object") return {};
  const { ...rest } = obj;
  return rest;
};

/**
 * Clona profundo de parametros para visualizacion.
 *
 * @param {*} value Parametros base.
 * @returns {*}
 */
export const stripWeightsDeep = (value) => stripWeights(value);

const filterOutWeightsParam = (param) =>
  Boolean(param) && !isCriteriaWeightsParameter(param);

/**
 * Filtra el parametro `weights` de una coleccion de parametros.
 *
 * @param {Array} params Parametros del modelo.
 * @returns {Array}
 */
export const filterOutWeightsParams = (params) =>
  Array.isArray(params) ? params.filter(filterOutWeightsParam) : [];

/**
 * Quita datos de pesos de la definicion de modelo.
 *
 * @param {Object} model Modelo del backend.
 * @returns {Object}
 */
export const omitWeightsFromModel = (model) => {
  if (!model || typeof model !== "object") return model;

  return {
    ...model,
    parameters: filterOutWeightsParams(model.parameters),
    defaultsResolved: stripWeightsDeep(model.defaultsResolved),
  };
};

/**
 * Construye parametros "pseudo" cuando no hay schema.
 *
 * @param {Object} values Valores base.
 * @returns {Array}
 */
export const buildPseudoParametersFromValues = (values) => {
  const source = values && typeof values === "object" ? values : {};

  return Object.keys(source)
    .sort()
    .map((name) => {
      const value = source[name];

      const isFuzzyArray =
        Array.isArray(value) &&
        value.length > 0 &&
        value.every(
          (triple) =>
            Array.isArray(triple) &&
            triple.length === 3 &&
            triple.every(
              (item) =>
                item === null || item === undefined || Number.isFinite(Number(item))
            )
        );

      const type = Number.isFinite(Number(value))
        ? "number"
        : isFuzzyArray
          ? "fuzzyArray"
          : Array.isArray(value)
            ? "array"
            : "json";

      return { name, type, default: value };
    });
};

/**
 * Convierte un valor a numero o vacio.
 *
 * @param {*} value Valor de entrada.
 * @returns {number|string}
 */
export const toNumberOrEmpty = (value) => {
  if (value === "" || value === null || value === undefined) return "";
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : "";
};

/**
 * Limita un numero por minimo y maximo.
 *
 * @param {number} number Numero a limitar.
 * @param {number|null} min Minimo.
 * @param {number|null} max Maximo.
 * @returns {number}
 */
export const clamp = (number, min, max) => {
  if (!Number.isFinite(number)) return number;
  if (min != null && Number.isFinite(min) && number < min) return min;
  if (max != null && Number.isFinite(max) && number > max) return max;
  return number;
};

/**
 * Asegura longitud fija para arrays.
 *
 * @param {Array} arr Array de entrada.
 * @param {number} len Longitud final.
 * @param {*} filler Valor de relleno.
 * @returns {Array}
 */
export const ensureArrayLen = (arr, len, filler = "") => {
  const next = Array.isArray(arr) ? [...arr] : [];
  if (next.length < len) return [...next, ...Array(len - next.length).fill(filler)];
  if (next.length > len) return next.slice(0, len);
  return next;
};

/**
 * Obtiene nombres de criterios hoja desde summary.
 *
 * @param {Array} summaryCriteria Arbol de criterios.
 * @returns {Array}
 */
export const getLeafCriteriaNamesFallback = (summaryCriteria) => {
  try {
    const leaf = extractLeafCriteria(summaryCriteria || []);
    return leaf.map((criterion) => criterion?.name).filter(Boolean);
  } catch {
    return [];
  }
};

const getEvaluationCompatibilityFlag = (model) => {
  return model?.compatibility?.evaluationStructure;
};

/**
 * Comprueba compatibilidad del modelo seleccionado.
 *
 * @param {Object} model Modelo candidato.
 * @returns {boolean}
 */
export const isModelCompatible = (model) => {
  const evalCompat = getEvaluationCompatibilityFlag(model);
  const domainCompat = model?.compatibility?.domain;

  if (evalCompat === false) return false;
  if (domainCompat === false) return false;

  return true;
};

/**
 * Motivo de incompatibilidad mostrado en UI.
 *
 * @param {Object} model Modelo candidato.
 * @param {string|null} domainType Dominio del issue.
 * @returns {string}
 */
export const getCompatReason = (model, domainType) => {
  const reasons = [];
  const evalCompat = getEvaluationCompatibilityFlag(model);

  if (evalCompat === false) reasons.push("Evaluation structure mismatch");
  if (model?.compatibility?.domain === false) {
    reasons.push(domainType ? `No ${domainType} support` : "Domain not supported");
  }

  return reasons.join(" · ");
};

/**
 * Construye valores resueltos a partir del schema del modelo.
 *
 * @param {Object} params Parametros de entrada.
 * @param {Object} params.model Modelo seleccionado.
 * @param {number} params.leafCount Numero de criterios hoja.
 * @returns {Object}
 */
export const buildParamsResolved = ({ model, leafCount }) => {
  if (model?.defaultsResolved) return stripWeightsDeep(model.defaultsResolved);

  const out = {};
  const safeLeafCount = Number.isInteger(leafCount) && leafCount > 0 ? leafCount : 0;
  const equalWeights = safeLeafCount > 0
    ? Array.from({ length: safeLeafCount }, () => 1 / safeLeafCount)
    : [];

  const baseIssueWeights = Array.isArray(model?.baseIssueWeights)
    ? model.baseIssueWeights
    : null;

  for (const param of model?.parameters || []) {
    const key = resolveParameterKey(param);
    if (!key) continue;

    if (param.type === "number") out[key] = param.default ?? "";

    if (param.type === "array") {
      const len = resolveLeafLengthForParameter(param, leafCount) ?? param?.restrictions?.length ?? 2;
      const base = Array.isArray(param.default) ? param.default : [];
      const count = Number(len) || 2;
      const isWeightsByCriteria = isCriteriaWeightsParameter(param);

      if (isWeightsByCriteria && Array.isArray(baseIssueWeights) && baseIssueWeights.length === count) {
        out[key] = ensureArrayLen(baseIssueWeights, count, "");
        continue;
      }

      if (isWeightsByCriteria && param?.default === "equal" && count > 0) {
        out[key] = ensureArrayLen(equalWeights, count, "");
        continue;
      }

      out[key] = ensureArrayLen(base, count, "");
    }

    if (param.type === "fuzzyArray") {
      const len = resolveLeafLengthForParameter(param, leafCount) ?? param?.restrictions?.length ?? 1;
      const count = Number(len) || 1;
      const base = Array.isArray(param.default) ? param.default : [];
      const filled = ensureArrayLen(base, count, ["", "", ""]).map((triple) =>
        Array.isArray(triple) && triple.length === 3 ? triple : ["", "", ""]
      );
      out[key] = filled;
    }
  }

  return out;
};

/**
 * Limpia parametros para payload de creacion de escenario.
 *
 * @param {Object} params Parametros de entrada.
 * @returns {Object}
 */
export const cleanParamsForSend = ({ model, values, leafCount }) => {
  const out = {};

  for (const param of model?.parameters || []) {
    const name = resolveParameterKey(param);
    if (!name) continue;
    const type = param.type;
    const restrictions = param.restrictions || {};
    const def = param.default;

    if (type === "number") {
      const raw = values?.[name];
      const value = raw === "" || raw == null ? def : raw;
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) continue;

      if (Array.isArray(restrictions.allowed) && restrictions.allowed.length) {
        if (!restrictions.allowed.includes(parsed)) continue;
        out[name] = parsed;
        continue;
      }

      out[name] = clamp(parsed, restrictions.min ?? null, restrictions.max ?? null);
      continue;
    }

    if (type === "array") {
      const len =
        resolveLeafLengthForParameter(param, leafCount) ??
        (typeof restrictions.length === "number" ? restrictions.length : null) ??
        (Array.isArray(def) ? def.length : 2);

      const arr = ensureArrayLen(values?.[name] ?? def ?? [], Number(len) || 2, "");
      const parsed = arr.map((item) => (item === "" || item == null ? null : Number(item)));
      if (parsed.some((item) => item == null || !Number.isFinite(item))) continue;

      out[name] = parsed.map((item) =>
        clamp(item, restrictions.min ?? null, restrictions.max ?? null)
      );
      continue;
    }

    if (type === "fuzzyArray") {
      const len =
        resolveLeafLengthForParameter(param, leafCount) ??
        (typeof restrictions.length === "number" ? restrictions.length : null) ??
        (Array.isArray(def) ? def.length : 1);

      const triples = ensureArrayLen(
        values?.[name] ?? def ?? [],
        Number(len) || 1,
        ["", "", ""]
      );

      const parsed = triples.map((triple) => {
        const safeTriple = Array.isArray(triple) ? triple : ["", "", ""];
        return safeTriple.map((item) => (item === "" || item == null ? null : Number(item)));
      });

      if (parsed.some((triple) => triple.some((item) => item == null || !Number.isFinite(item)))) {
        continue;
      }

      out[name] = parsed.map(([l, m, u]) => [
        clamp(l, restrictions.min ?? null, restrictions.max ?? null),
        clamp(m, restrictions.min ?? null, restrictions.max ?? null),
        clamp(u, restrictions.min ?? null, restrictions.max ?? null),
      ]);
    }
  }

  return out;
};

/**
 * Valida parametros antes de crear un nuevo escenario.
 *
 * @param {Object} params Parametros de entrada.
 * @returns {{ok: boolean, msg?: string}}
 */
export const validateParams = ({ model, values, leafCount }) => {
  for (const param of model?.parameters || []) {
    const name = resolveParameterKey(param);
    if (!name) continue;
    const type = param.type;
    const restrictions = param.restrictions || {};
    const value = values?.[name];

    if (type === "number") {
      if (value === "" || value == null) continue;
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) {
        return { ok: false, msg: `Parameter '${name}' must be a number.` };
      }
      if (
        Array.isArray(restrictions.allowed) &&
        restrictions.allowed.length &&
        !restrictions.allowed.includes(parsed)
      ) {
        return {
          ok: false,
          msg: `Parameter '${name}' must be one of: ${restrictions.allowed.join(", ")}.`,
        };
      }
      if (restrictions.min != null && parsed < restrictions.min) {
        return { ok: false, msg: `Parameter '${name}' must be ≥ ${restrictions.min}.` };
      }
      if (restrictions.max != null && parsed > restrictions.max) {
        return { ok: false, msg: `Parameter '${name}' must be ≤ ${restrictions.max}.` };
      }
      continue;
    }

    if (type === "array") {
      const len =
        resolveLeafLengthForParameter(param, leafCount) ??
        (typeof restrictions.length === "number" ? restrictions.length : null) ??
        (Array.isArray(param.default) ? param.default.length : 2);

      const arr = ensureArrayLen(
        Array.isArray(value)
          ? value
          : Array.isArray(param.default)
            ? param.default
            : [],
        Number(len) || 2,
        ""
      );

      if (arr.some((item) => item === "" || item == null || !Number.isFinite(Number(item)))) {
        return {
          ok: false,
          msg: `Parameter '${name}' must be a complete array of ${len} numbers.`,
        };
      }

      const numbers = arr.map((item) => Number(item));
      const sum = numbers.reduce((acc, item) => acc + item, 0);

      if (restrictions.normalize === true) {
        if (sum <= 0) {
          return { ok: false, msg: `Parameter '${name}' must contain at least one value greater than 0.` };
        }
      } else if (restrictions.sum != null) {
        const epsilon = 1e-6;
        if (Math.abs(sum - restrictions.sum) > epsilon) {
          return { ok: false, msg: `Parameter '${name}' sum must be ${restrictions.sum}.` };
        }
      }

      if (
        Number(len) === 2 &&
        !restrictions.sum &&
        resolveLeafLengthForParameter(param, leafCount) == null
      ) {
        if (numbers[0] >= numbers[1]) {
          return { ok: false, msg: `Parameter '${name}' must satisfy left < right.` };
        }
      }

      continue;
    }

    if (type === "fuzzyArray") {
      const len =
        resolveLeafLengthForParameter(param, leafCount) ??
        (typeof restrictions.length === "number" ? restrictions.length : null) ??
        (Array.isArray(param.default) ? param.default.length : 1);

      const triples = ensureArrayLen(
        Array.isArray(value)
          ? value
          : Array.isArray(param.default)
            ? param.default
            : [],
        Number(len) || 1,
        ["", "", ""]
      );

      for (let index = 0; index < triples.length; index += 1) {
        const triple = triples[index];

        if (!Array.isArray(triple) || triple.length !== 3) {
          return {
            ok: false,
            msg: `Parameter '${name}' must be an array of triples.`,
          };
        }

        const numbers = triple.map((item) => Number(item));
        if (numbers.some((item) => !Number.isFinite(item))) {
          return {
            ok: false,
            msg: `Parameter '${name}' has invalid fuzzy values.`,
          };
        }

        const [l, m, u] = numbers;
        if (l > m || m > u) {
          return {
            ok: false,
            msg: `Parameter '${name}' requires l ≤ m ≤ u.`,
          };
        }
      }
    }
  }

  return { ok: true };
};

const deepClone = (value) =>
  typeof structuredClone === "function"
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));

const toScoreOrNull = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const buildRankingFromRawOutput = ({ rawOutput, alternativesByIndex }) => {
  const rankingIndexes = Array.isArray(rawOutput?.collective_ranking)
    ? rawOutput.collective_ranking
    : [];
  const scores = Array.isArray(rawOutput?.collective_scores)
    ? rawOutput.collective_scores
    : [];

  if (!rankingIndexes.length || !Array.isArray(alternativesByIndex) || !alternativesByIndex.length) {
    return [];
  }

  return rankingIndexes
    .map((rankIndex) => {
      const index = Number(rankIndex);
      if (!Number.isInteger(index) || index < 0 || index >= alternativesByIndex.length) {
        return null;
      }

      const alternative = alternativesByIndex[index];
      if (!alternative?.name) return null;

      return {
        name: alternative.name,
        score: toScoreOrNull(scores[index]),
      };
    })
    .filter(Boolean);
};

const normalizeScenarioRanking = ({ scenario, details, rawOutput, alternativesByIndex }) => {
  const fromRankedWithScores = Array.isArray(details?.rankedWithScores)
    ? details.rankedWithScores
    : [];
  if (fromRankedWithScores.length) return fromRankedWithScores;

  const fromRankedAlternatives = Array.isArray(details?.rankedAlternatives)
    ? details.rankedAlternatives
    : [];
  if (fromRankedAlternatives.length) {
    const objectShape = fromRankedAlternatives.every(
      (item) => item && typeof item === "object" && item.name
    );
    if (objectShape) return fromRankedAlternatives;
    return fromRankedAlternatives
      .map((name) => (typeof name === "string" && name.trim() ? { name: name.trim(), score: null } : null))
      .filter(Boolean);
  }

  const scenarioRanking = scenario?.outputs?.ranking || scenario?.result?.ranking;
  if (Array.isArray(scenarioRanking) && scenarioRanking.length) {
    return scenarioRanking
      .map((name) => (typeof name === "string" && name.trim() ? { name: name.trim(), score: null } : null))
      .filter(Boolean);
  }

  const scenarioRankedWithScores =
    scenario?.outputs?.rankedWithScores || scenario?.result?.rankedWithScores;
  if (Array.isArray(scenarioRankedWithScores) && scenarioRankedWithScores.length) {
    return scenarioRankedWithScores;
  }

  const scoresByAlternative =
    details?.scoresByAlternative ||
    scenario?.outputs?.scoresByAlternative ||
    scenario?.result?.scoresByAlternative ||
    null;
  const rankingByName =
    details?.ranking || scenario?.outputs?.ranking || scenario?.result?.ranking || null;
  if (Array.isArray(rankingByName) && rankingByName.length && scoresByAlternative && typeof scoresByAlternative === "object") {
    return rankingByName
      .map((name) => (typeof name === "string" && name.trim()
        ? { name: name.trim(), score: toScoreOrNull(scoresByAlternative[name]) }
        : null))
      .filter(Boolean);
  }

  return buildRankingFromRawOutput({ rawOutput, alternativesByIndex });
};

/**
 * Proyecta un escenario de simulacion sobre la estructura base del issue.
 *
 * @param {Object} baseIssueInfo Datos base del issue.
 * @param {Object} scenario Escenario cargado.
 * @returns {Object}
 */
export const applyScenarioToIssueInfo = (baseIssueInfo, scenario) => {
  const out = deepClone(baseIssueInfo || {});
  const details = scenario?.outputs?.details || {};
  const scenarioOutputs = scenario?.outputs || null;
  const scenarioRawOutput =
    scenarioOutputs?.rawResults ??
    scenarioOutputs?.details?.modelExecution?.rawOutput ??
    null;
  const collectiveEvaluations = scenario?.outputs?.collectiveEvaluations || null;
  const scenarioEvaluationStructure = scenario?.targetEvaluationStructure || scenario?.evaluationStructure || null;
  const alternativesByIndex = Array.isArray(out?.summary?.alternatives)
    ? out.summary.alternatives
    : [];
  const normalizedRanking = normalizeScenarioRanking({
    scenario,
    details,
    rawOutput: scenarioRawOutput,
    alternativesByIndex,
  });

  out.summary = {
    ...(out.summary || {}),
    model: scenario?.targetModelName || out?.summary?.model,
    modelName: scenario?.targetModelName || out?.summary?.modelName,
    targetModelName: scenario?.targetModelName,
    evaluationStructure:
      scenarioEvaluationStructure || out?.summary?.evaluationStructure,
    modelParameters:
      scenario?.config?.normalizedModelParameters ||
      scenario?.config?.modelParameters ||
      out?.summary?.modelParameters,
  };

  out.modelParams = { ...(out.modelParams || {}) };
  out.modelParams.base = {
    ...(out.modelParams.base || {}),
    modelName: scenario?.targetModelName || out.modelParams.base?.modelName,
    evaluationStructure:
      scenarioEvaluationStructure || out.modelParams.base?.evaluationStructure,
    paramsSaved:
      scenario?.config?.modelParameters || out.modelParams.base?.paramsSaved,
    paramsResolved:
      scenario?.config?.normalizedModelParameters ||
      out.modelParams.base?.paramsResolved,
  };

  out.alternativesRankings = [{ phase: 1, ranking: normalizedRanking }];
  out.consensus = [];
  out.consensusHistory = [];
  out.consensusRounds = [];
  out.consensusDetails = details;
  out.modelExecution =
    details?.modelExecution ||
    (scenarioRawOutput !== null && scenarioRawOutput !== undefined
      ? { rawOutput: scenarioRawOutput }
      : null);
  out.selectedScenario = {
    config: scenario?.config || null,
    outputs: scenarioOutputs,
  };

  const scatterPlot = details?.plotsGraphic;
  if (scatterPlot?.expert_points && scatterPlot?.collective_point) {
    out.analyticalGraphs = { ...(out.analyticalGraphs || {}), scatterPlot: [scatterPlot] };
  }

  if (collectiveEvaluations && out?.expertsRatings && typeof out.expertsRatings === "object") {
    for (const key of Object.keys(out.expertsRatings)) {
      if (out.expertsRatings[key]) {
        out.expertsRatings[key].collectiveEvaluations = collectiveEvaluations;
      }
    }
  }

  return out;
};
