import {
  createBadRequestError,
} from "../../../utils/common/errors.js";

const normalizeNonEmptyString = (value) => {
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
  const normalized = [...arr];

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
  const modelParameters = modelDoc.parameters;

  for (const parameter of modelParameters) {
    const { type, default: defaultValue } = parameter;
    const name = normalizeNonEmptyString(parameter.key);
    if (!name) continue;

    if (type === "number") {
      resolved[name] = defaultValue;
      continue;
    }

    if (type === "array") {
      const scope = normalizeNonEmptyString(parameter.scope);
      const fixedLength = parameter.restrictions?.length ?? null;
      const length =
        (scope === "perCriterion" ? leafCount : fixedLength) ??
        (defaultValue.length || 2);

      const isCriteriaWeights =
        normalizeNonEmptyString(parameter.semanticRole) === "criteriaWeights";

      if (
        isCriteriaWeights &&
        defaultValue.trim().toLowerCase() === "equal" &&
        safeLeafCount > 0
      ) {
        const equalWeights = Array.from({ length: safeLeafCount }, () => 1 / safeLeafCount);
        resolved[name] = ensureLen(equalWeights, length, null);
        continue;
      }

      const base = defaultValue;
      resolved[name] = ensureLen(base, length, null);
      continue;
    }

    if (type === "fuzzyArray") {
      const scope = normalizeNonEmptyString(parameter.scope);
      const fixedLength = parameter.restrictions?.length ?? null;
      const length =
        (scope === "perCriterion" ? leafCount : fixedLength) ??
        (defaultValue.length || 1);

      const base = defaultValue;
      resolved[name] = ensureLen(base, length, [null, null, null]).map((triangle) =>
        triangle
      );
      continue;
    }

    resolved[name] = defaultValue;
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
  const merged = { ...defaultsResolved };

  for (const [key, value] of Object.entries(savedParams)) {
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
  return paramsUsed.weights;
};
