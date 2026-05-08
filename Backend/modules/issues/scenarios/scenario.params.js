import { createBadRequestError } from "../../../utils/common/errors.js";

const normalizeNonEmptyString = (value) => {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

/**
 * Ajusta la longitud de un array rellenando o truncando según corresponda.
 *
 * @param {unknown[]} arr Array de entrada.
 * @param {number} len Longitud deseada.
 * @param {unknown} [filler=null] Valor de relleno.
 * @returns {unknown[]}
 */
const ensureLen = (arr, len, filler = null) => {
  const normalized = Array.isArray(arr) ? [...arr] : [];

  if (normalized.length < len) {
    return [...normalized, ...Array(len - normalized.length).fill(filler)];
  }

  if (normalized.length > len) {
    return normalized.slice(0, len);
  }

  return normalized;
};

/**
 * Resuelve los parámetros por defecto de un modelo según el número de criterios hoja.
 *
 * @param {object} params Parámetros de entrada.
 * @param {Object} params.modelDoc Documento del modelo.
 * @param {number} params.leafCount Número de criterios hoja.
 * @returns {Object}
 */
export const buildDefaultsResolved = ({ modelDoc, leafCount }) => {
  const resolved = {};
  const safeLeafCount = Number.isInteger(leafCount) && leafCount > 0 ? leafCount : 0;

  for (const parameter of modelDoc?.parameters || []) {
    const { type, default: defaultValue } = parameter;
    const name = normalizeNonEmptyString(parameter?.key);
    if (!name) continue;

    if (type === "number") {
      resolved[name] = defaultValue ?? null;
      continue;
    }

    if (type === "array") {
      const scope = normalizeNonEmptyString(parameter?.scope);
      const fixedLength =
        typeof parameter?.restrictions?.length === "number"
          ? parameter.restrictions.length
          : null;
      const length =
        (scope === "perCriterion" ? leafCount : fixedLength) ??
        (Array.isArray(defaultValue) ? defaultValue.length : 2);

      const base = Array.isArray(defaultValue) ? defaultValue : [];
      const isCriteriaWeights =
        normalizeNonEmptyString(parameter?.semanticRole) === "criteriaWeights";

      if (isCriteriaWeights && typeof defaultValue === "string" && defaultValue.trim().toLowerCase() === "equal" && safeLeafCount > 0) {
        const equalWeights = Array.from({ length: safeLeafCount }, () => 1 / safeLeafCount);
        resolved[name] = ensureLen(equalWeights, length, null);
        continue;
      }

      resolved[name] = ensureLen(base, length, null);
      continue;
    }

    if (type === "fuzzyArray") {
      const scope = normalizeNonEmptyString(parameter?.scope);
      const fixedLength =
        typeof parameter?.restrictions?.length === "number"
          ? parameter.restrictions.length
          : null;
      const length =
        (scope === "perCriterion" ? leafCount : fixedLength) ??
        (Array.isArray(defaultValue) ? defaultValue.length : 1);

      const base = Array.isArray(defaultValue) ? defaultValue : [];
      resolved[name] = ensureLen(base, length, [null, null, null]).map(
        (triangle) =>
          Array.isArray(triangle) && triangle.length === 3
            ? triangle
            : [null, null, null]
      );
      continue;
    }

    resolved[name] = defaultValue ?? null;
  }

  return resolved;
};

/**
 * Fusiona parámetros guardados con sus valores resueltos por defecto.
 *
 * @param {object} params Parámetros de entrada.
 * @param {Object} params.defaultsResolved Defaults resueltos.
 * @param {Object} params.savedParams Parámetros guardados.
 * @returns {Object}
 */
export const mergeParamsResolved = ({ defaultsResolved, savedParams }) => {
  const merged = { ...(defaultsResolved || {}) };

  for (const [key, value] of Object.entries(savedParams || {})) {
    merged[key] = value;
  }

  return merged;
};

export const normalizeScenarioParamOverridesOrThrow = (paramOverrides) => {
  if (paramOverrides == null) {
    return {};
  }

  if (typeof paramOverrides !== "object" || Array.isArray(paramOverrides)) {
    throw createBadRequestError("paramOverrides must be an object", {
      field: "paramOverrides",
    });
  }

  return paramOverrides;
};

/**
 * Resuelve weights como array a partir de paramsUsed y criterios ordenados.
 *
 * @param {object} params Parámetros de entrada.
 * @param {Object} params.paramsUsed Parámetros usados.
 * @param {Array<Object>} params.criteria Criterios ordenados.
 * @returns {Array<*> | null}
 */
export const resolveScenarioWeightsArray = ({ paramsUsed, criteria }) => {
  const weights = paramsUsed?.weights;

  if (Array.isArray(weights)) {
    return weights;
  }

  if (weights && typeof weights === "object") {
    return criteria.map((criterion) =>
      weights[criterion.name] != null ? weights[criterion.name] : null
    );
  }

  return null;
};
