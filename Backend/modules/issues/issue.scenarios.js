// Models
import { Evaluation } from "../../models/Evaluations.js";

/**
 * Convierte un valor en string seguro para comparaciones de ids.
 *
 * @param {unknown} value Valor a convertir.
 * @returns {string}
 */
const asId = (value) => (value ? String(value) : "");

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
 * @param {Record<string, any>} params.modelDoc Documento del modelo.
 * @param {number} params.leafCount Número de criterios hoja.
 * @returns {Record<string, any>}
 */
export const buildDefaultsResolved = ({ modelDoc, leafCount }) => {
  const resolved = {};

  for (const parameter of modelDoc?.parameters || []) {
    const { name, type, default: defaultValue } = parameter;

    if (type === "number") {
      resolved[name] = defaultValue ?? null;
      continue;
    }

    if (type === "array") {
      const length =
        parameter?.restrictions?.length === "matchCriteria"
          ? leafCount
          : (typeof parameter?.restrictions?.length === "number"
              ? parameter.restrictions.length
              : null) ??
            (Array.isArray(defaultValue) ? defaultValue.length : 2);

      const base = Array.isArray(defaultValue) ? defaultValue : [];
      resolved[name] = ensureLen(base, length, null);
      continue;
    }

    if (type === "fuzzyArray") {
      const length =
        parameter?.restrictions?.length === "matchCriteria"
          ? leafCount
          : (typeof parameter?.restrictions?.length === "number"
              ? parameter.restrictions.length
              : null) ??
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
 * @param {Record<string, any>} params.defaultsResolved Defaults resueltos.
 * @param {Record<string, any>} params.savedParams Parámetros guardados.
 * @returns {Record<string, any>}
 */
export const mergeParamsResolved = ({ defaultsResolved, savedParams }) => {
  const merged = { ...(defaultsResolved || {}) };

  for (const [key, value] of Object.entries(savedParams || {})) {
    merged[key] = value;
  }

  return merged;
};

/**
 * Resuelve weights como array a partir de paramsUsed y criterios ordenados.
 *
 * @param {object} params Parámetros de entrada.
 * @param {Record<string, any>} params.paramsUsed Parámetros usados.
 * @param {Array<Record<string, any>>} params.criteria Criterios ordenados.
 * @returns {any[] | null}
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

/**
 * Construye matrices directas para escenarios preservando la lógica actual.
 *
 * @param {object} params Parámetros de entrada.
 * @param {import("mongoose").Types.ObjectId | string} params.issueId Id del issue.
 * @param {Array<Record<string, any>>} params.alternatives Alternativas ordenadas.
 * @param {Array<Record<string, any>>} params.criteria Criterios hoja ordenados.
 * @param {Array<Record<string, any>>} params.participations Participaciones aceptadas con expert populado.
 * @returns {Promise<{ matricesUsed: Record<string, Array<Array<any>>>, snapshotIdsUsed: string[] }>}
 */
export const buildScenarioDirectMatrices = async ({
  issueId,
  alternatives,
  criteria,
  participations,
}) => {
  const expertIds = participations
    .map((participation) => participation.expert?._id)
    .filter(Boolean);

  const evaluationDocs = await Evaluation.find({
    issue: issueId,
    expert: { $in: expertIds },
    comparedAlternative: null,
  })
    .select("expert alternative criterion value expressionDomain")
    .populate("expressionDomain", "type linguisticLabels numericRange name")
    .lean();

  const evaluationMap = new Map();
  const snapshotSet = new Set();

  for (const evaluation of evaluationDocs) {
    const key = `${asId(evaluation.expert)}_${asId(evaluation.alternative)}_${asId(
      evaluation.criterion
    )}`;
    evaluationMap.set(key, evaluation);

    if (evaluation.expressionDomain?._id) {
      snapshotSet.add(asId(evaluation.expressionDomain._id));
    }
  }

  const matricesUsed = {};

  for (const participation of participations) {
    const expertEmail = participation.expert.email;
    const expertId = asId(participation.expert._id);

    const matrixForExpert = [];

    for (const alternative of alternatives) {
      const row = [];

      for (const criterion of criteria) {
        const key = `${expertId}_${asId(alternative._id)}_${asId(criterion._id)}`;
        const evaluation = evaluationMap.get(key);

        let value = evaluation?.value ?? null;

        if (
          value != null &&
          evaluation?.expressionDomain?.type === "numeric" &&
          typeof value === "string"
        ) {
          const numericValue = Number(value);
          value = Number.isFinite(numericValue) ? numericValue : value;
        }

        if (value != null && evaluation?.expressionDomain?.type === "linguistic") {
          const labelDefinition = evaluation.expressionDomain.linguisticLabels?.find(
            (label) => label.label === value
          );
          value = labelDefinition ? labelDefinition.values : null;
        }

        row.push(value);
      }

      matrixForExpert.push(row);
    }

    matricesUsed[expertEmail] = matrixForExpert;
  }

  return {
    matricesUsed,
    snapshotIdsUsed: Array.from(snapshotSet),
  };
};

/**
 * Construye matrices pairwise para escenarios preservando la lógica actual.
 *
 * @param {object} params Parámetros de entrada.
 * @param {import("mongoose").Types.ObjectId | string} params.issueId Id del issue.
 * @param {Array<Record<string, any>>} params.alternatives Alternativas ordenadas.
 * @param {Array<Record<string, any>>} params.criteria Criterios hoja ordenados.
 * @param {Array<Record<string, any>>} params.participations Participaciones aceptadas con expert populado.
 * @returns {Promise<{ matricesUsed: Record<string, Record<string, Array<Array<any>>>>, snapshotIdsUsed: string[] }>}
 */
export const buildScenarioPairwiseMatrices = async ({
  issueId,
  alternatives,
  criteria,
  participations,
}) => {
  const expertIds = participations
    .map((participation) => participation.expert?._id)
    .filter(Boolean);

  const evaluationDocs = await Evaluation.find({
    issue: issueId,
    expert: { $in: expertIds },
    comparedAlternative: { $ne: null },
  })
    .select("expert alternative comparedAlternative criterion value expressionDomain")
    .populate("expressionDomain", "type")
    .lean();

  const snapshotSet = new Set();
  for (const evaluation of evaluationDocs) {
    if (evaluation.expressionDomain?._id) {
      snapshotSet.add(asId(evaluation.expressionDomain._id));
    }
  }

  const alternativeIndexMap = new Map(
    alternatives.map((alternative, index) => [asId(alternative._id), index])
  );
  const criterionNameById = new Map(
    criteria.map((criterion) => [asId(criterion._id), criterion.name])
  );

  const matricesUsed = {};

  for (const participation of participations) {
    matricesUsed[participation.expert.email] = {};

    for (const criterion of criteria) {
      const size = alternatives.length;
      matricesUsed[participation.expert.email][criterion.name] = Array.from(
        { length: size },
        (_, rowIndex) =>
          Array.from({ length: size }, (_, colIndex) =>
            rowIndex === colIndex ? 0.5 : null
          )
      );
    }
  }

  for (const evaluation of evaluationDocs) {
    const participation = participations.find(
      (item) => asId(item.expert._id) === asId(evaluation.expert)
    );
    if (!participation) continue;

    const criterionName = criterionNameById.get(asId(evaluation.criterion));
    if (!criterionName) continue;

    const rowIndex = alternativeIndexMap.get(asId(evaluation.alternative));
    const colIndex = alternativeIndexMap.get(asId(evaluation.comparedAlternative));

    if (rowIndex == null || colIndex == null) continue;

    let value = evaluation.value ?? null;
    if (value != null && typeof value === "string") {
      const numericValue = Number(value);
      value = Number.isFinite(numericValue) ? numericValue : value;
    }

    matricesUsed[participation.expert.email][criterionName][rowIndex][colIndex] =
      value;
  }

  return {
    matricesUsed,
    snapshotIdsUsed: Array.from(snapshotSet),
  };
};