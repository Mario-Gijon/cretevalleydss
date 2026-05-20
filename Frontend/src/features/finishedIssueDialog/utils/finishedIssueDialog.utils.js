import { extractLeafCriteria } from "../../issueEvaluation/shared/leafCriteria.utils";
import { getParameterExpectedLength } from "../../modelParameters";

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

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

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
  Boolean(param) &&
  !["criteriaWeights", "fuzzyCriteriaWeights"].includes(param?.handlerKey);

const isCriteriaWeightsParameter = (parameter) =>
  parameter?.handlerKey === "criteriaWeights";

/**
 * Filtra el parametro `weights` de una coleccion de parametros.
 *
 * @param {Array} params Parametros del modelo.
 * @returns {Array}
 */
export const filterOutWeightsParams = (params) =>
  Array.isArray(params) ? params.filter(filterOutWeightsParam) : [];

const resolveScenarioModelParameters = (model) =>
  filterOutWeightsParams(Array.isArray(model?.parameters) ? model.parameters : []);

const resolveFuzzyWeightsValueCount = (model) => {
  const valueCount = Number(model?.fuzzyWeightsValueCount);
  return Number.isInteger(valueCount) && valueCount >= 2 ? valueCount : null;
};

const buildSyntheticWeightsParameter = (model) => {
  if (model?.usesCriteriaWeights !== true) {
    return null;
  }

  if (model?.usesFuzzyCriteriaWeights === true) {
    return {
      key: "weights",
      label: "Fuzzy criteria weights",
      type: "fuzzyArray",
      scope: "perCriterion",
      handlerKey: "fuzzyCriteriaWeights",
      required: true,
      default: "equal",
      restrictions: {
        min: 0,
        max: 1,
        ordered: "nonDecreasing",
        length: resolveFuzzyWeightsValueCount(model),
        allowed: null,
      },
    };
  }

  return {
    key: "weights",
    label: "Criteria weights",
    type: "array",
    scope: "perCriterion",
    handlerKey: "criteriaWeights",
    required: true,
    default: "equal",
    restrictions: {
      min: 0,
      max: 1,
      ordered: null,
      length: "matchCriteria",
      allowed: null,
    },
  };
};

const getScenarioParameterDefinitions = (model) => {
  const params = resolveScenarioModelParameters(model);
  const syntheticWeights = buildSyntheticWeightsParameter(model);
  return syntheticWeights ? [...params, syntheticWeights] : params;
};

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
    parameters: resolveScenarioModelParameters(model),
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

const normalizeValueType = (parameter) =>
  String(parameter?.valueType || "").trim().toLowerCase();

const parseByValueType = (rawValue, valueType) => {
  if (rawValue === "" || rawValue === null || rawValue === undefined) return null;

  if (valueType === "number" || valueType === "integer") {
    const parsed = Number(rawValue);
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (valueType === "boolean") {
    if (rawValue === true || rawValue === false) return rawValue;
    const normalized = String(rawValue).trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
    return null;
  }

  return rawValue;
};

const enumValueIsAllowed = ({ value, allowed, valueType }) => {
  if (!Array.isArray(allowed) || allowed.length === 0) return true;

  if (valueType === "number" || valueType === "integer") {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return false;
    return allowed.some((allowedValue) => Number(allowedValue) === numericValue);
  }

  return allowed.some((allowedValue) => allowedValue === value);
};

const parseIntervalPair = (value) => {
  if (!Array.isArray(value) || value.length !== 2) return null;
  const left = Number(value[0]);
  const right = Number(value[1]);
  if (!Number.isFinite(left) || !Number.isFinite(right)) return null;
  return [left, right];
};

const validateIntervalByRestrictions = ({ pair, restrictions }) => {
  if (!Array.isArray(pair) || pair.length !== 2) return false;
  const [left, right] = pair;
  const min = restrictions?.min;
  const max = restrictions?.max;

  if (min != null && (left < Number(min) || right < Number(min))) return false;
  if (max != null && (left > Number(max) || right > Number(max))) return false;

  const ordered = restrictions?.ordered;
  if (ordered === "strictIncreasing" && !(left < right)) return false;
  if (ordered === "nonDecreasing" && !(left <= right)) return false;

  return true;
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
  return model?.compatibility?.alternativeEvaluationStructure;
};

const isFinitePoint = (point) =>
  Array.isArray(point) &&
  point.length === 2 &&
  Number.isFinite(Number(point[0])) &&
  Number.isFinite(Number(point[1]));

const normalizePoint = (point) => ({
  x: Number(point[0]),
  y: Number(point[1]),
});

export const normalizePlotsGraphic = (plotsGraphic) => {
  if (!plotsGraphic || typeof plotsGraphic !== "object") {
    return null;
  }

  const expertPointsRaw = Array.isArray(plotsGraphic.expert_points)
    ? plotsGraphic.expert_points
    : Array.isArray(plotsGraphic.expertPoints)
      ? plotsGraphic.expertPoints
      : null;

  const collectivePointRaw = Array.isArray(plotsGraphic.collective_point)
    ? plotsGraphic.collective_point
    : Array.isArray(plotsGraphic.collectivePoint)
      ? plotsGraphic.collectivePoint
      : null;

  const reason =
    typeof plotsGraphic.reason === "string" && plotsGraphic.reason.trim()
      ? plotsGraphic.reason.trim()
      : null;

  const labelsRaw = Array.isArray(plotsGraphic.expert_labels)
    ? plotsGraphic.expert_labels
    : [];
  const pointsByEmailRaw =
    plotsGraphic.expert_points_by_email &&
    typeof plotsGraphic.expert_points_by_email === "object"
      ? plotsGraphic.expert_points_by_email
      : null;

  const expertPoints = [];

  if (pointsByEmailRaw) {
    for (const [label, point] of Object.entries(pointsByEmailRaw)) {
      if (!isFinitePoint(point)) continue;
      expertPoints.push({
        label: String(label),
        ...normalizePoint(point),
      });
    }
  } else if (Array.isArray(expertPointsRaw)) {
    expertPointsRaw.forEach((point, index) => {
      if (!isFinitePoint(point)) return;
      const labelCandidate = labelsRaw[index];
      const label =
        typeof labelCandidate === "string" && labelCandidate.trim()
          ? labelCandidate.trim()
          : `Expert ${index + 1}`;

      expertPoints.push({
        label,
        ...normalizePoint(point),
      });
    });
  }

  const collectivePoint = isFinitePoint(collectivePointRaw)
    ? {
        label: "Collective",
        ...normalizePoint(collectivePointRaw),
      }
    : null;

  return {
    expertPoints,
    collectivePoint,
    reason,
    raw: plotsGraphic,
    isValid:
      expertPoints.length > 0 &&
      isFinitePoint([collectivePoint?.x, collectivePoint?.y]),
  };
};

/**
 * Comprueba compatibilidad del modelo seleccionado.
 *
 * @param {Object} model Modelo candidato.
 * @returns {boolean}
 */
export const isModelCompatible = (model) => {
  if (model?.scenarioCompatibility && typeof model.scenarioCompatibility === "object") {
    return model.scenarioCompatibility.compatible === true;
  }

  const evalCompat = getEvaluationCompatibilityFlag(model);
  const domainCompat = model?.compatibility?.domain;
  const consensusCompatible = model?.supportsConsensus !== true;

  if (evalCompat === false) return false;
  if (domainCompat === false) return false;
  if (!consensusCompatible) return false;

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
  if (model?.scenarioCompatibility && typeof model.scenarioCompatibility === "object") {
    const reasons = Array.isArray(model.scenarioCompatibility.reasons)
      ? model.scenarioCompatibility.reasons.filter(Boolean)
      : [];
    return reasons.join(" · ");
  }

  const reasons = [];
  const evalCompat = getEvaluationCompatibilityFlag(model);

  if (evalCompat === false) reasons.push("Evaluation structure mismatch");
  if (model?.compatibility?.domain === false) {
    reasons.push(domainType ? `No ${domainType} support` : "Domain not supported");
  }
  if (model?.supportsConsensus === true) {
    reasons.push("Consensus scenarios are not supported");
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
  const out = isPlainObject(model?.defaultsResolved)
    ? stripWeightsDeep(model.defaultsResolved)
    : {};
  const safeLeafCount = Number.isInteger(leafCount) && leafCount > 0 ? leafCount : 0;
  const equalWeights = safeLeafCount > 0
    ? Array.from({ length: safeLeafCount }, () => 1 / safeLeafCount)
    : [];

  const baseIssueWeights = Array.isArray(model?.baseIssueWeights)
    ? model.baseIssueWeights
    : null;

  for (const param of getScenarioParameterDefinitions(model)) {
    const key = param?.key;
    if (!key) continue;

    if (param.type === "number") out[key] = param.default ?? "";

    if (param.type === "enum") out[key] = param.default ?? "";

    if (param.type === "interval") {
      const min = param?.restrictions?.min ?? "";
      const max = param?.restrictions?.max ?? "";
      out[key] = ensureArrayLen(Array.isArray(param.default) ? param.default : [min, max], 2, "");
    }

    if (param.type === "array") {
      const len =
        getParameterExpectedLength(param, leafCount) ??
        param?.restrictions?.length ??
        2;
      const base = Array.isArray(param.default) ? param.default : [];
      const count = Number(len) || 2;
      const isWeightsByCriteria = isCriteriaWeightsParameter(param);

      if (isWeightsByCriteria && safeLeafCount === 1) {
        out[key] = [1];
        continue;
      }

      if (isWeightsByCriteria && param?.default === "equal" && count > 0) {
        out[key] = ensureArrayLen(equalWeights, count, "");
        continue;
      }

      if (
        isWeightsByCriteria &&
        Array.isArray(baseIssueWeights) &&
        baseIssueWeights.length === count
      ) {
        out[key] = ensureArrayLen(baseIssueWeights, count, "");
        continue;
      }

      out[key] = ensureArrayLen(base, count, "");
    }

    if (param.type === "fuzzyArray") {
      const isFuzzyWeightsByCriteria = param?.handlerKey === "fuzzyCriteriaWeights";
      const fuzzyValueCount =
        Number(param?.restrictions?.length) || resolveFuzzyWeightsValueCount(model);
      if (
        isFuzzyWeightsByCriteria &&
        safeLeafCount === 1 &&
        Number.isInteger(fuzzyValueCount) &&
        fuzzyValueCount >= 2
      ) {
        out[key] = [Array.from({ length: fuzzyValueCount }, () => 1)];
        continue;
      }

      const len = getParameterExpectedLength(param, leafCount) ?? param?.restrictions?.length ?? 1;
      const count = Number(len) || 1;
      const vectorLength =
        Number.isInteger(Number(param?.restrictions?.length)) &&
        Number(param.restrictions.length) >= 2
          ? Number(param.restrictions.length)
          : 3;
      const base = Array.isArray(param.default) ? param.default : [];
      const fillerVector = Array.from({ length: vectorLength }, () => "");
      const filled = ensureArrayLen(base, count, fillerVector).map((vector) =>
        Array.isArray(vector) && vector.length === vectorLength
          ? vector
          : [...fillerVector]
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

  for (const param of getScenarioParameterDefinitions(model)) {
    const name = param?.key;
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
      const isWeightsByCriteria = isCriteriaWeightsParameter(param);
      const len =
        getParameterExpectedLength(param, leafCount) ??
        (typeof restrictions.length === "number" ? restrictions.length : null) ??
        (Array.isArray(def) ? def.length : 2);
      const count = Number(len) || 2;

      if (isWeightsByCriteria && Number(leafCount) === 1) {
        out[name] = [1];
        continue;
      }

      const fallbackDefault =
        isWeightsByCriteria && def === "equal" && count > 0
          ? Array.from({ length: count }, () => 1 / count)
          : def;

      const arr = ensureArrayLen(
        values?.[name] ?? fallbackDefault ?? [],
        count,
        ""
      );
      const parsed = arr.map((item) => (item === "" || item == null ? null : Number(item)));
      if (parsed.some((item) => item == null || !Number.isFinite(item))) continue;

      out[name] = parsed.map((item) =>
        clamp(item, restrictions.min ?? null, restrictions.max ?? null)
      );
      continue;
    }

    if (type === "enum") {
      const valueType = normalizeValueType(param);
      const raw = values?.[name];
      const value = raw === "" || raw == null ? def : raw;
      const parsed = parseByValueType(value, valueType);
      if (parsed == null) continue;

      if (!enumValueIsAllowed({ value: parsed, allowed: restrictions.allowed, valueType })) {
        continue;
      }

      out[name] = parsed;
      continue;
    }

    if (type === "interval") {
      const fallback = Array.isArray(def)
        ? def
        : [restrictions.min ?? "", restrictions.max ?? ""];
      const source = values?.[name] ?? fallback;
      const parsed = parseIntervalPair(ensureArrayLen(source, 2, ""));
      if (!parsed) continue;
      if (!validateIntervalByRestrictions({ pair: parsed, restrictions })) continue;
      out[name] = parsed;
      continue;
    }

    if (type === "fuzzyArray") {
      const isFuzzyWeightsByCriteria = param?.handlerKey === "fuzzyCriteriaWeights";
      const fuzzyValueCount =
        Number(restrictions.length) || resolveFuzzyWeightsValueCount(model);
      if (
        isFuzzyWeightsByCriteria &&
        Number(leafCount) === 1 &&
        Number.isInteger(fuzzyValueCount) &&
        fuzzyValueCount >= 2
      ) {
        out[name] = [Array.from({ length: fuzzyValueCount }, () => 1)];
        continue;
      }

      const len =
        getParameterExpectedLength(param, leafCount) ??
        (typeof restrictions.length === "number" ? restrictions.length : null) ??
        (Array.isArray(def) ? def.length : 1);
      const vectorLength =
        Number.isInteger(Number(restrictions.length)) &&
        Number(restrictions.length) >= 2
          ? Number(restrictions.length)
          : 3;
      const fillerVector = Array.from({ length: vectorLength }, () => "");

      const triples = ensureArrayLen(
        values?.[name] ?? def ?? [],
        Number(len) || 1,
        fillerVector
      );

      const parsed = triples.map((vector) => {
        const safeVector =
          Array.isArray(vector) && vector.length === vectorLength
            ? vector
            : fillerVector;
        return safeVector.map((item) => (item === "" || item == null ? null : Number(item)));
      });

      if (parsed.some((vector) => vector.some((item) => item == null || !Number.isFinite(item)))) {
        continue;
      }

      out[name] = parsed.map((vector) =>
        vector.map((item) =>
          clamp(item, restrictions.min ?? null, restrictions.max ?? null)
        )
      );
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
  for (const param of getScenarioParameterDefinitions(model)) {
    const name = param?.key;
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

    if (type === "enum") {
      const valueType = normalizeValueType(param);
      const raw = value === "" || value == null ? param.default : value;
      const parsed = parseByValueType(raw, valueType);

      if ((value === "" || value == null) && param?.required && parsed == null) {
        return { ok: false, msg: `Parameter '${name}' is required.` };
      }

      if (parsed == null) continue;

      if (!enumValueIsAllowed({ value: parsed, allowed: restrictions.allowed, valueType })) {
        return {
          ok: false,
          msg: `Parameter '${name}' must be one of: ${(restrictions.allowed || []).join(", ")}.`,
        };
      }
      continue;
    }

    if (type === "interval") {
      const fallback = Array.isArray(param.default)
        ? param.default
        : [restrictions.min ?? "", restrictions.max ?? ""];
      const source = value == null ? fallback : value;
      const parsed = parseIntervalPair(ensureArrayLen(source, 2, ""));

      if (!parsed) {
        return {
          ok: false,
          msg: `Parameter '${name}' must be an array of 2 finite numbers.`,
        };
      }

      if (!validateIntervalByRestrictions({ pair: parsed, restrictions })) {
        if (restrictions.ordered === "strictIncreasing") {
          return { ok: false, msg: `Parameter '${name}' must satisfy left < right.` };
        }
        if (restrictions.ordered === "nonDecreasing") {
          return { ok: false, msg: `Parameter '${name}' must satisfy left ≤ right.` };
        }
        if (restrictions.min != null) {
          return { ok: false, msg: `Parameter '${name}' must be ≥ ${restrictions.min}.` };
        }
        if (restrictions.max != null) {
          return { ok: false, msg: `Parameter '${name}' must be ≤ ${restrictions.max}.` };
        }
      }
      continue;
    }

    if (type === "array") {
      const isWeightsByCriteria = isCriteriaWeightsParameter(param);
      const len =
        getParameterExpectedLength(param, leafCount) ??
        (typeof restrictions.length === "number" ? restrictions.length : null) ??
        (Array.isArray(param.default) ? param.default.length : 2);
      const count = Number(len) || 2;

      if (isWeightsByCriteria && Number(leafCount) === 1) {
        continue;
      }

      const fallbackDefault =
        isWeightsByCriteria && param.default === "equal" && count > 0
          ? Array.from({ length: count }, () => 1 / count)
          : param.default;

      const arr = ensureArrayLen(
        Array.isArray(value)
          ? value
          : Array.isArray(fallbackDefault)
            ? fallbackDefault
            : [],
        count,
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
        getParameterExpectedLength(param, leafCount) == null
      ) {
        if (numbers[0] >= numbers[1]) {
          return { ok: false, msg: `Parameter '${name}' must satisfy left < right.` };
        }
      }

      continue;
    }

    if (type === "fuzzyArray") {
      const isFuzzyWeightsByCriteria = param?.handlerKey === "fuzzyCriteriaWeights";
      const fuzzyValueCount =
        Number(restrictions.length) || resolveFuzzyWeightsValueCount(model);
      if (
        isFuzzyWeightsByCriteria &&
        Number(leafCount) === 1 &&
        Number.isInteger(fuzzyValueCount) &&
        fuzzyValueCount >= 2
      ) {
        continue;
      }

      const len =
        getParameterExpectedLength(param, leafCount) ??
        (typeof restrictions.length === "number" ? restrictions.length : null) ??
        (Array.isArray(param.default) ? param.default.length : 1);
      const vectorLength =
        Number.isInteger(Number(restrictions.length)) &&
        Number(restrictions.length) >= 2
          ? Number(restrictions.length)
          : 3;
      const fillerVector = Array.from({ length: vectorLength }, () => "");

      const triples = ensureArrayLen(
        Array.isArray(value)
          ? value
          : Array.isArray(param.default)
            ? param.default
            : [],
        Number(len) || 1,
        fillerVector
      );

      for (let index = 0; index < triples.length; index += 1) {
        const triple = triples[index];

        if (!Array.isArray(triple) || triple.length !== vectorLength) {
          return {
            ok: false,
            msg: `Parameter '${name}' must be an array of vectors with length ${vectorLength}.`,
          };
        }

        const numbers = triple.map((item) => Number(item));
        if (numbers.some((item) => !Number.isFinite(item))) {
          return {
            ok: false,
            msg: `Parameter '${name}' has invalid fuzzy values.`,
          };
        }

        for (let vectorIndex = 1; vectorIndex < numbers.length; vectorIndex += 1) {
          if (numbers[vectorIndex] < numbers[vectorIndex - 1]) {
            return {
              ok: false,
              msg: `Parameter '${name}' requires non-decreasing fuzzy vectors.`,
            };
          }
        }

        if (
          restrictions.min != null &&
          numbers.some((item) => item < Number(restrictions.min))
        ) {
          return {
            ok: false,
            msg: `Parameter '${name}' must be ≥ ${restrictions.min}.`,
          };
        }

        if (
          restrictions.max != null &&
          numbers.some((item) => item > Number(restrictions.max))
        ) {
          return {
            ok: false,
            msg: `Parameter '${name}' must be ≤ ${restrictions.max}.`,
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

const normalizeScenarioRanking = ({
  scenario,
  standardResult,
  rawOutput,
  alternativesByIndex,
}) => {
  const fromRankedWithScores = Array.isArray(standardResult?.rankedWithScores)
    ? standardResult.rankedWithScores
    : [];
  if (fromRankedWithScores.length) return fromRankedWithScores;

  const fromRankedAlternatives = Array.isArray(standardResult?.rankedAlternatives)
    ? standardResult.rankedAlternatives
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
    standardResult?.scoresByAlternative ||
    scenario?.outputs?.scoresByAlternative ||
    scenario?.result?.scoresByAlternative ||
    null;
  const rankingByName =
    standardResult?.ranking ||
    scenario?.outputs?.ranking ||
    scenario?.result?.ranking ||
    null;
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
  const scenarioOutputs = scenario?.outputs || {};
  const standardResult = scenarioOutputs?.standardResult || {};
  const modelExecutionOutput = scenarioOutputs?.modelExecution || null;
  const scenarioRawOutput =
    scenarioOutputs?.rawOutput ??
    standardResult?.rawOutput ??
    modelExecutionOutput?.rawOutput ??
    null;
  const scenarioEvaluationStructure =
    scenario?.targetAlternativeEvaluationStructureKey ||
    scenario?.alternativeEvaluationStructureKey ||
    null;
  const alternativesByIndex = Array.isArray(out?.summary?.alternatives)
    ? out.summary.alternatives
    : [];
  const normalizedRanking = normalizeScenarioRanking({
    scenario,
    standardResult,
    rawOutput: scenarioRawOutput,
    alternativesByIndex,
  });
  const collectiveEvaluations =
    standardResult?.collectiveEvaluations &&
    typeof standardResult.collectiveEvaluations === "object"
      ? standardResult.collectiveEvaluations
      : null;

  out.summary = {
    ...(out.summary || {}),
    model: scenario?.targetModelName || out?.summary?.model,
    modelName: scenario?.targetModelName || out?.summary?.modelName,
    targetModelName: scenario?.targetModelName,
    alternativeEvaluationStructureKey:
      scenarioEvaluationStructure || out?.summary?.alternativeEvaluationStructureKey,
    modelParameters:
      scenario?.config?.normalizedModelParameters ||
      scenario?.config?.modelParameters ||
      out?.summary?.modelParameters,
  };

  out.modelParams = { ...(out.modelParams || {}) };
  out.modelParams.base = {
    ...(out.modelParams.base || {}),
    modelName: scenario?.targetModelName || out.modelParams.base?.modelName,
    alternativeEvaluationStructureKey:
      scenarioEvaluationStructure ||
      out.modelParams.base?.alternativeEvaluationStructureKey,
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
  out.consensusDetails = {
    modelExecution: modelExecutionOutput,
    rankedAlternatives: normalizedRanking,
    plotsGraphic: standardResult?.plotsGraphic || {},
    scoresByAlternative: standardResult?.scoresByAlternative || {},
  };
  out.modelExecution =
    modelExecutionOutput ||
    (scenarioRawOutput !== null && scenarioRawOutput !== undefined
      ? { rawOutput: scenarioRawOutput }
      : null);
  out.selectedScenario = {
    config: scenario?.config || null,
    outputs: scenarioOutputs,
  };

  const scatterPlot = standardResult?.plotsGraphic;
  const normalizedPlotsGraphic = normalizePlotsGraphic(scatterPlot);
  if (normalizedPlotsGraphic) {
    out.analyticalGraphs = {
      ...(out.analyticalGraphs || {}),
      plotsGraphic: scatterPlot,
      ...(normalizedPlotsGraphic.isValid ? { scatterPlot: [scatterPlot] } : {}),
    };
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
