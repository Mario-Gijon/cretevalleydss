// Utils
import { orderDocsByIdList } from "../../utils/issueOrdering.js";

/**
 * Convierte un valor en string seguro para comparaciones de ids.
 *
 * @param {unknown} value Valor a convertir.
 * @returns {string}
 */
const asId = (value) => (value ? String(value) : "");

/**
 * Metadata de stages para la UI de issues activos.
 */
export const ACTIVE_STAGE_META = {
  criteriaWeighting: {
    key: "criteriaWeighting",
    label: "Criteria weighting",
    short: "Weighting",
    colorKey: "info",
  },
  weightsFinished: {
    key: "weightsFinished",
    label: "Weights finished",
    short: "Weights done",
    colorKey: "warning",
  },
  alternativeEvaluation: {
    key: "alternativeEvaluation",
    label: "Alternative evaluation",
    short: "Evaluation",
    colorKey: "info",
  },
  alternativeConsensus: {
    key: "alternativeConsensus",
    label: "Alternative consensus",
    short: "Consensus",
    colorKey: "success",
  },
  finished: {
    key: "finished",
    label: "Finished",
    short: "Finished",
    colorKey: "success",
  },
};

/**
 * Metadata de acciones para la UI de issues activos.
 */
export const ACTIVE_ACTION_META = {
  resolveIssue: {
    key: "resolveIssue",
    label: "Resolve issue",
    role: "admin",
    severity: "warning",
    sortPriority: 0,
  },
  computeWeights: {
    key: "computeWeights",
    label: "Compute weights",
    role: "admin",
    severity: "warning",
    sortPriority: 10,
  },
  evaluateWeights: {
    key: "evaluateWeights",
    label: "Evaluate weights",
    role: "expert",
    severity: "info",
    sortPriority: 30,
  },
  evaluateAlternatives: {
    key: "evaluateAlternatives",
    label: "Evaluate alternatives",
    role: "expert",
    severity: "info",
    sortPriority: 40,
  },
  waitingAdmin: {
    key: "waitingAdmin",
    label: "Waiting admin",
    role: "expert",
    severity: "success",
    sortPriority: 60,
  },
};

/**
 * Acciones que aparecen en el task center.
 */
export const ACTIVE_TASK_ACTION_KEYS = [
  "resolveIssue",
  "computeWeights",
  "evaluateWeights",
  "evaluateAlternatives",
];

/**
 * Devuelve un objeto de tareas vacío para la UI de activos.
 *
 * @returns {{
 *   resolveIssue: unknown[],
 *   computeWeights: unknown[],
 *   evaluateWeights: unknown[],
 *   evaluateAlternatives: unknown[],
 *   waitingAdmin: unknown[],
 * }}
 */
export const getEmptyTasksByType = () => ({
  resolveIssue: [],
  computeWeights: [],
  evaluateWeights: [],
  evaluateAlternatives: [],
  waitingAdmin: [],
});

/**
 * Incrementa un contador en un objeto acumulador.
 *
 * @param {Record<string, number>} counters Objeto acumulador.
 * @param {string} key Clave a incrementar.
 * @returns {void}
 */
export const incrementCounter = (counters, key) => {
  counters[key] = (counters[key] || 0) + 1;
};

/**
 * Elimina el campo weights de modelParameters para respuestas de issues activos.
 *
 * @param {unknown} modelParameters Parámetros del modelo.
 * @returns {Record<string, unknown>}
 */
export const cleanModelParameters = (modelParameters) => {
  const parsed =
    modelParameters && typeof modelParameters === "object"
      ? { ...modelParameters }
      : {};

  if ("weights" in parsed) {
    delete parsed.weights;
  }

  return parsed;
};

/**
 * Detecta si el issue ya dispone de pesos directos.
 *
 * @param {Record<string, any>} issue Issue a inspeccionar.
 * @returns {boolean}
 */
export const detectHasDirectWeights = (issue) => {
  const weightingMode = String(issue?.weightingMode || "").toLowerCase();

  if (["manual", "direct", "predefined", "fixed"].includes(weightingMode)) {
    return true;
  }

  const weights = issue?.modelParameters?.weights;
  return (
    Array.isArray(weights) &&
    weights.length > 0 &&
    weights.some((value) => value !== null && value !== undefined)
  );
};

/**
 * Detecta si el issue tiene consenso de alternativas habilitado.
 *
 * @param {Record<string, any>} issue Issue a inspeccionar.
 * @returns {boolean}
 */
export const detectHasAlternativeConsensusEnabled = (issue) =>
  Boolean(issue?.isConsensus);

/**
 * Construye los pasos del workflow para la UI de activos.
 *
 * @param {object} params Parámetros de entrada.
 * @param {boolean} params.hasDirectWeights Indica si el issue tiene pesos directos.
 * @param {boolean} params.hasAlternativeConsensus Indica si el issue tiene consenso de alternativas.
 * @returns {Array<{ key: string, label: string }>}
 */
export const buildWorkflowStepsStable = ({
  hasDirectWeights,
  hasAlternativeConsensus,
}) => {
  if (hasDirectWeights) {
    return [
      { key: "weightsAssigned", label: "Weights assigned" },
      { key: "alternativeEvaluation", label: "Alternative evaluation" },
      ...(hasAlternativeConsensus
        ? [{ key: "alternativeConsensus", label: "Alternative consensus" }]
        : []),
      { key: "readyResolve", label: "Ready to resolve" },
    ];
  }

  return [
    { key: "criteriaWeighting", label: "Criteria weighting" },
    { key: "weightsFinished", label: "Weights finished" },
    { key: "alternativeEvaluation", label: "Alternative evaluation" },
    ...(hasAlternativeConsensus
      ? [{ key: "alternativeConsensus", label: "Alternative consensus" }]
      : []),
    { key: "readyResolve", label: "Ready to resolve" },
  ];
};

/**
 * Calcula la metadata de deadline para un issue.
 *
 * @param {string | null | undefined} closureDate Fecha de cierre.
 * @param {import("dayjs").Dayjs} dayjsLib Instancia de dayjs.
 * @returns {{ hasDeadline: boolean, daysLeft: number | null, overdue: boolean, iso: string | null }}
 */
export const buildDeadlineInfo = (closureDate, dayjsLib) => {
  if (!closureDate) {
    return {
      hasDeadline: false,
      daysLeft: null,
      overdue: false,
      iso: null,
    };
  }

  const parsedDate = dayjsLib(closureDate, "DD-MM-YYYY", true);
  if (!parsedDate.isValid()) {
    return {
      hasDeadline: false,
      daysLeft: null,
      overdue: false,
      iso: null,
    };
  }

  const daysLeft = parsedDate
    .startOf("day")
    .diff(dayjsLib().startOf("day"), "day");

  return {
    hasDeadline: true,
    daysLeft,
    overdue: daysLeft < 0,
    iso: parsedDate.toISOString(),
  };
};

/**
 * Construye una estructura de árbol de criterios para la UI de activos.
 *
 * @param {Array<Record<string, any>>} issueCriteriaDocs Criterios del issue.
 * @param {Record<string, any>} issueDoc Documento del issue.
 * @returns {{
 *   criteriaTree: Array<Record<string, any>>,
 *   orderedLeafNodes: Array<Record<string, any>>,
 * }}
 */
export const buildIssueCriteriaTree = (issueCriteriaDocs, issueDoc) => {
  const normalizedCriteria = issueCriteriaDocs.map((criterion) => ({
    id: asId(criterion._id),
    name: criterion.name,
    type: criterion.type,
    isLeaf: Boolean(criterion.isLeaf),
    parentId: asId(criterion.parentCriterion),
    children: [],
  }));

  const byId = new Map(normalizedCriteria.map((node) => [node.id, node]));
  const criteriaTree = [];

  for (const node of normalizedCriteria) {
    if (node.parentId && byId.has(node.parentId)) {
      byId.get(node.parentId).children.push(node);
    } else {
      criteriaTree.push(node);
    }
  }

  const leafNodes = normalizedCriteria.filter((node) => node.isLeaf);

  const orderedLeafNodes = orderDocsByIdList(
    leafNodes,
    issueDoc.leafCriteriaOrder,
    {
      getId: (node) => node.id,
      getName: (node) => node.name,
    }
  );

  return { criteriaTree, orderedLeafNodes };
};

/**
 * Añade metadata de visualización al árbol de criterios.
 *
 * @param {Array<Record<string, any>>} criteriaTree Árbol de criterios.
 * @param {Record<string, unknown>} finalWeightsById Pesos finales por id.
 * @returns {void}
 */
export const decorateCriteriaTree = (criteriaTree, finalWeightsById) => {
  const decorateNode = (node, depth = 0) => {
    const isLeaf = Boolean(node.isLeaf) || !(node.children?.length);

    node.depth = depth;
    node.display = {
      showType: depth === 0,
      showWeight: isLeaf,
      weight: isLeaf ? finalWeightsById?.[node.id] ?? null : null,
    };

    if (node.children?.length) {
      node.children.forEach((child) => decorateNode(child, depth + 1));
    }
  };

  criteriaTree.forEach((root) => decorateNode(root, 0));
};