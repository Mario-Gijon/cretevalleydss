// Utils
import { orderDocsByIdList } from "../../modules/issues/issue.ordering.js";
import { sameId, toIdString } from "../../utils/common/ids.js";

import {
  EVALUATION_STRUCTURES,
  resolveEvaluationStructure,
} from "./issue.evaluationStructure.js";

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
 * Construye el árbol de criterios del issue y devuelve también
 * la lista de criterios hoja en el orden configurado en el issue.
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
    id: toIdString(criterion._id),
    name: criterion.name,
    type: criterion.type,
    isLeaf: Boolean(criterion.isLeaf),
    parentId: toIdString(criterion.parentCriterion),
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

  return {
    criteriaTree,
    orderedLeafNodes,
  };
};

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

const ACTIVE_ROLE_OPTIONS = [
  { value: "all", label: "All roles" },
  { value: "admin", label: "Admin" },
  { value: "expert", label: "Expert" },
  { value: "both", label: "Admin & Expert" },
  { value: "viewer", label: "Viewer" },
];

/**
 * Agrupa una colección por issue id.
 *
 * @param {Array<Record<string, any>>} items Elementos a agrupar.
 * @param {(item: Record<string, any>) => any} selector Selector del issue id.
 * @returns {Record<string, Array<Record<string, any>>>}
 */
const groupByIssueId = (items, selector) => {
  const grouped = {};

  for (const item of items || []) {
    const issueId = toIdString(selector(item));
    if (!issueId) continue;

    if (!grouped[issueId]) {
      grouped[issueId] = [];
    }

    grouped[issueId].push(item);
  }

  return grouped;
};

/**
 * Construye las opciones de stage para filtros de activos.
 *
 * @returns {Array<{ value: string, label: string }>}
 */
const buildStageOptions = () => [
  { value: "all", label: "All stages" },
  ...Object.values(ACTIVE_STAGE_META).map((stage) => ({
    value: stage.key,
    label: stage.label,
  })),
];

/**
 * Construye las opciones de acción para filtros de activos.
 *
 * @returns {Array<{ value: string, label: string }>}
 */
const buildActionOptions = () => [
  { value: "all", label: "All actions" },
  { value: "waitingExperts", label: "Waiting experts" },
  ...Object.values(ACTIVE_ACTION_META)
    .sort((a, b) => a.sortPriority - b.sortPriority)
    .map((action) => ({
      value: action.key,
      label: action.label,
    })),
  { value: "none", label: "No pending action" },
];

/**
 * Construye las opciones de orden para filtros de activos.
 *
 * @param {boolean} [includeSmart=false] Indica si se añade la opción Smart.
 * @returns {Array<{ value: string, label: string }>}
 */
const buildSortOptions = (includeSmart = false) => [
  ...(includeSmart ? [{ value: "smart", label: "Smart" }] : []),
  { value: "nameAsc", label: "Name (A→Z)" },
  { value: "nameDesc", label: "Name (Z→A)" },
  { value: "deadlineSoon", label: "Deadline (soonest)" },
];

/**
 * Construye mapas auxiliares para la respuesta de activos.
 *
 * @param {object} params Parámetros de entrada.
 * @param {Array<Record<string, any>>} params.participations Participaciones de los issues visibles.
 * @param {Array<Record<string, any>>} params.alternatives Alternativas de los issues visibles.
 * @param {Array<Record<string, any>>} params.criteria Criterios de los issues visibles.
 * @param {Array<Record<string, any>>} params.consensusPhases Fases de consenso guardadas.
 * @returns {{
 *   participationMap: Record<string, Array<Record<string, any>>>,
 *   alternativesMap: Record<string, Array<Record<string, any>>>,
 *   criteriaMap: Record<string, Array<Record<string, any>>>,
 *   consensusPhaseCountMap: Record<string, number>,
 * }}
 */
export const buildActiveIssueCollections = ({
  participations,
  alternatives,
  criteria,
  consensusPhases,
}) => {
  const consensusPhaseCountMap = (consensusPhases || []).reduce(
    (acc, phaseDoc) => {
      const issueId = toIdString(phaseDoc.issue);
      if (!issueId) return acc;

      acc[issueId] = (acc[issueId] || 0) + 1;
      return acc;
    },
    {}
  );

  return {
    participationMap: groupByIssueId(
      participations || [],
      (participation) => participation.issue
    ),
    alternativesMap: groupByIssueId(
      alternatives || [],
      (alternative) => alternative.issue
    ),
    criteriaMap: groupByIssueId(criteria || [], (criterion) => criterion.issue),
    consensusPhaseCountMap,
  };
};

/**
 * Construye la vista de un issue activo y las tareas asociadas para el task center.
 *
 * @param {object} params Parámetros de entrada.
 * @param {Record<string, any>} params.issue Documento del issue.
 * @param {string} params.userId Id del usuario actual.
 * @param {Set<string>} params.adminIssueIdSet Set de ids de issues donde el usuario es admin.
 * @param {Array<Record<string, any>>} params.issueParticipations Participaciones del issue.
 * @param {Array<Record<string, any>>} params.issueAlternativeDocs Alternativas del issue.
 * @param {Array<Record<string, any>>} params.issueCriteriaDocs Criterios del issue.
 * @param {number} params.savedPhasesCount Número de fases de consenso ya guardadas.
 * @param {import("dayjs").Dayjs} params.dayjsLib Instancia de dayjs.
 * @returns {{
 *   issueView: Record<string, any>,
 *   taskItems: Array<Record<string, any>>,
 * }}
 */
export const buildActiveIssueView = ({
  issue,
  userId,
  adminIssueIdSet,
  issueParticipations,
  issueAlternativeDocs,
  issueCriteriaDocs,
  savedPhasesCount,
  dayjsLib,
}) => {
  const issueId = toIdString(issue._id);
  const evaluationStructure =
    issue.evaluationStructure || resolveEvaluationStructure(issue.model);

  const isValidUserId =
    Boolean(userId) &&
    userId !== "undefined" &&
    userId !== "null" &&
    userId !== "[object Object]";

  const adminId = toIdString(issue?.admin);
  const isAdminUser =
    isValidUserId &&
    ((adminId && adminId === userId) || adminIssueIdSet.has(issueId));

  const acceptedExperts = (issueParticipations || []).filter(
    (participation) => participation.invitationStatus === "accepted"
  );
  const pendingExperts = (issueParticipations || []).filter(
    (participation) => participation.invitationStatus === "pending"
  );
  const declinedExperts = (issueParticipations || []).filter(
    (participation) => participation.invitationStatus === "declined"
  );

  const hasPending = pendingExperts.length > 0;
  const realParticipants = acceptedExperts;

  const totalAccepted = acceptedExperts.length;
  const weightsDone = acceptedExperts.filter(
    (participation) => participation.weightsCompleted
  ).length;
  const evalsDone = acceptedExperts.filter(
    (participation) => participation.evaluationCompleted
  ).length;

  const realWeightsDone = realParticipants.filter(
    (participation) => participation.weightsCompleted
  ).length;
  const realEvalsDone = realParticipants.filter(
    (participation) => participation.evaluationCompleted
  ).length;

  const isExpertAccepted = acceptedExperts.some((participation) =>
    sameId(participation.expert?._id, userId)
  );

  const myParticipation =
    (issueParticipations || []).find((participation) =>
      sameId(participation.expert?._id, userId)
    ) || null;

  const orderedAlternativeDocs = orderDocsByIdList(
    issueAlternativeDocs || [],
    issue.alternativeOrder
  );
  const alternativeNames = orderedAlternativeDocs.map(
    (alternative) => alternative.name
  );

  const { criteriaTree, orderedLeafNodes } = buildIssueCriteriaTree(
    issueCriteriaDocs || [],
    issue
  );

  const weightsArray = issue.modelParameters?.weights || [];

  const finalWeightsById = orderedLeafNodes.reduce((acc, node, index) => {
    acc[node.id] = weightsArray[index] ?? null;
    return acc;
  }, {});

  const finalWeightsMap = orderedLeafNodes.reduce((acc, node, index) => {
    acc[node.name] = weightsArray[index] ?? null;
    return acc;
  }, {});

  decorateCriteriaTree(criteriaTree, finalWeightsById);

  const consensusCurrentPhase = (savedPhasesCount || 0) + 1;

  const deadline = buildDeadlineInfo(issue.closureDate, dayjsLib);
  const stage = issue.currentStage;

  const allWeightsDone =
    realParticipants.length > 0 &&
    realWeightsDone === realParticipants.length;

  const allEvalsDone =
    realParticipants.length > 0 &&
    realEvalsDone === realParticipants.length;

  const waitingAdmin =
    !isAdminUser &&
    !hasPending &&
    ((stage === "weightsFinished" && allWeightsDone) ||
      (stage === "alternativeEvaluation" && allEvalsDone));

  const canComputeWeights =
    stage === "weightsFinished" &&
    isAdminUser &&
    !hasPending &&
    realParticipants.length > 0 &&
    allWeightsDone;

  const canResolveIssue =
    stage === "alternativeEvaluation" &&
    isAdminUser &&
    !hasPending &&
    realParticipants.length > 0 &&
    allEvalsDone;

  const canEvaluateWeights =
    stage === "criteriaWeighting" &&
    isExpertAccepted &&
    realParticipants.some(
      (participation) =>
        sameId(participation.expert?._id, userId) &&
        !participation.weightsCompleted
    );

  const canEvaluateAlternatives =
    stage === "alternativeEvaluation" &&
    isExpertAccepted &&
    realParticipants.some(
      (participation) =>
        sameId(participation.expert?._id, userId) &&
        !participation.evaluationCompleted
    );

  const waitingExperts =
    (hasPending && stage !== "finished") ||
    (!waitingAdmin &&
      !canResolveIssue &&
      !canComputeWeights &&
      !canEvaluateWeights &&
      !canEvaluateAlternatives &&
      stage !== "finished");

  const statusFlags = {
    canEvaluateWeights,
    canComputeWeights,
    canEvaluateAlternatives,
    canResolveIssue,
    waitingAdmin,
    waitingExperts,
  };

  const actions = [];
  if (canResolveIssue) actions.push(ACTIVE_ACTION_META.resolveIssue);
  if (canComputeWeights) actions.push(ACTIVE_ACTION_META.computeWeights);
  if (canEvaluateWeights) actions.push(ACTIVE_ACTION_META.evaluateWeights);
  if (canEvaluateAlternatives) {
    actions.push(ACTIVE_ACTION_META.evaluateAlternatives);
  }

  actions.sort((a, b) => a.sortPriority - b.sortPriority);

  const nextAction = actions[0] ?? null;

  let statusLabel = ACTIVE_STAGE_META[stage]?.label ?? stage;
  let statusKey = stage;

  if (stage === "finished") {
    statusLabel = "Finished";
    statusKey = "finished";
  } else if (waitingAdmin) {
    statusLabel = "Waiting for admin";
    statusKey = "waitingAdmin";
  } else if (nextAction) {
    statusLabel = nextAction.label;
    statusKey = nextAction.key;
  } else {
    statusLabel = "Waiting experts";
    statusKey = "waitingExperts";
  }

  const sortPriority = waitingAdmin
    ? ACTIVE_ACTION_META.waitingAdmin?.sortPriority ?? 60
    : nextAction
      ? nextAction.sortPriority
      : 80;

  const taskItems = actions
    .filter((action) => ACTIVE_TASK_ACTION_KEYS.includes(action.key))
    .filter((action) => !(action.role === "admin" && !isAdminUser))
    .filter((action) => !(action.role === "expert" && !isExpertAccepted))
    .map((action) => ({
      issueId,
      issueName: issue.name,
      stage,
      role: action.role,
      severity: action.severity,
      actionKey: action.key,
      actionLabel: action.label,
      sortPriority: action.sortPriority,
      deadline,
    }));

  const participatedExperts =
    stage === "criteriaWeighting" || stage === "weightsFinished"
      ? acceptedExperts.filter(
          (participation) => participation.weightsCompleted === true
        )
      : acceptedExperts.filter(
          (participation) => participation.evaluationCompleted === true
        );

  const acceptedButNotEvaluated =
    stage === "criteriaWeighting" || stage === "weightsFinished"
      ? acceptedExperts.filter(
          (participation) => !participation.weightsCompleted
        )
      : acceptedExperts.filter(
          (participation) => !participation.evaluationCompleted
        );

  const evaluated = participatedExperts.some((participation) =>
    sameId(participation.expert?._id, userId)
  );

  const role =
    isAdminUser && isExpertAccepted
      ? "both"
      : isAdminUser
        ? "admin"
        : isExpertAccepted
          ? "expert"
          : "viewer";

  const responseModelParameters = cleanModelParameters(issue.modelParameters);

  const hasDirectWeights = detectHasDirectWeights(issue);
  const hasAlternativeConsensus =
    detectHasAlternativeConsensusEnabled(issue);

  const workflowSteps = buildWorkflowStepsStable({
    hasDirectWeights,
    hasAlternativeConsensus,
  });

  return {
    taskItems,
    issueView: {
      id: issueId,
      name: issue.name,
      creator: issue.admin?.email,
      description: issue.description,
      model: issue.model,
      evaluationStructure,
      isPairwise:
        evaluationStructure ===
        EVALUATION_STRUCTURES.PAIRWISE_ALTERNATIVES,
      isConsensus: Boolean(issue.isConsensus),
      currentStage: stage,
      weightingMode: issue.weightingMode,
      ...(issue.model?.isConsensus && {
        consensusMaxPhases: issue.consensusMaxPhases || "Unlimited",
        consensusThreshold: issue.consensusThreshold,
        consensusCurrentPhase,
      }),
      creationDate: issue.creationDate || null,
      closureDate: issue.closureDate || null,
      isAdmin: isAdminUser,
      isExpert: isExpertAccepted,
      role,
      alternatives: alternativeNames,
      criteria: criteriaTree,
      evaluated,
      totalExperts:
        participatedExperts.length +
        pendingExperts.length +
        declinedExperts.length +
        acceptedButNotEvaluated.length,
      participatedExperts: participatedExperts
        .map((participation) => participation.expert.email)
        .sort(),
      pendingExperts: pendingExperts
        .map((participation) => participation.expert.email)
        .sort(),
      notAcceptedExperts: declinedExperts
        .map((participation) => participation.expert.email)
        .sort(),
      acceptedButNotEvaluatedExperts: acceptedButNotEvaluated
        .map((participation) => participation.expert.email)
        .sort(),
      statusFlags,
      progress: {
        weightsDone,
        evalsDone,
        totalAccepted,
      },
      finalWeights: finalWeightsMap,
      modelParameters: responseModelParameters,
      myParticipation: myParticipation
        ? {
            invitationStatus: myParticipation.invitationStatus,
            weightsCompleted: Boolean(myParticipation.weightsCompleted),
            evaluationCompleted: Boolean(myParticipation.evaluationCompleted),
            joinedAt: myParticipation.joinedAt || null,
          }
        : null,
      actions,
      nextAction,
      ui: {
        stage,
        stageLabel: ACTIVE_STAGE_META[stage]?.label ?? stage,
        stageColorKey: ACTIVE_STAGE_META[stage]?.colorKey ?? "default",
        statusKey,
        statusLabel,
        sortPriority,
        deadline,
        hasDirectWeights,
        hasAlternativeConsensus,
        workflowSteps,
        permissions: {
          evaluateWeights: canEvaluateWeights,
          evaluateAlternatives: canEvaluateAlternatives,
          computeWeights: canComputeWeights,
          resolveIssue: canResolveIssue,
          waitingAdmin,
          waitingExperts: statusKey === "waitingExperts",
        },
        modelParameters: responseModelParameters,
      },
    },
  };
};

/**
 * Ordena la colección de issues activos según prioridad de UI, deadline y nombre.
 *
 * @param {Array<Record<string, any>>} issues Issues formateados.
 * @returns {void}
 */
export const sortActiveIssues = (issues) => {
  (issues || []).sort((a, b) => {
    const aPriority = a.ui?.sortPriority ?? 90;
    const bPriority = b.ui?.sortPriority ?? 90;
    if (aPriority !== bPriority) return aPriority - bPriority;

    const aDeadline = a.ui?.deadline?.hasDeadline
      ? a.ui.deadline.daysLeft
      : 999999;
    const bDeadline = b.ui?.deadline?.hasDeadline
      ? b.ui.deadline.daysLeft
      : 999999;
    if (aDeadline !== bDeadline) return aDeadline - bDeadline;

    return String(a.name).localeCompare(String(b.name));
  });
};

/**
 * Ordena las tareas agrupadas por tipo para el task center.
 *
 * @param {Record<string, Array<Record<string, any>>>} tasksByType Tareas agrupadas.
 * @returns {void}
 */
export const sortActiveTasksByType = (tasksByType) => {
  for (const actionKey of ACTIVE_TASK_ACTION_KEYS) {
    (tasksByType[actionKey] || []).sort((a, b) => {
      if (a.sortPriority !== b.sortPriority) {
        return a.sortPriority - b.sortPriority;
      }

      const aDeadline = a.deadline?.hasDeadline ? a.deadline.daysLeft : 999999;
      const bDeadline = b.deadline?.hasDeadline ? b.deadline.daysLeft : 999999;
      if (aDeadline !== bDeadline) return aDeadline - bDeadline;

      return String(a.issueName).localeCompare(String(b.issueName));
    });
  }
};

/**
 * Construye el task center a partir de las tareas agrupadas.
 *
 * @param {Record<string, Array<Record<string, any>>>} tasksByType Tareas agrupadas.
 * @returns {{ total: number, sections: Array<Record<string, any>> }}
 */
export const buildActiveTaskCenter = (tasksByType) => {
  const total = ACTIVE_TASK_ACTION_KEYS.reduce(
    (acc, key) => acc + (tasksByType[key]?.length || 0),
    0
  );

  const sections = Object.values(ACTIVE_ACTION_META)
    .filter((action) => ACTIVE_TASK_ACTION_KEYS.includes(action.key))
    .sort((a, b) => a.sortPriority - b.sortPriority)
    .map((action) => {
      const items = tasksByType[action.key] || [];

      return {
        key: action.key,
        title: action.label,
        role: action.role,
        severity: action.severity,
        sortPriority: action.sortPriority,
        count: items.length,
        items,
      };
    })
    .filter((section) => section.count > 0);

  return {
    total,
    sections,
  };
};

/**
 * Construye la metadata de filtros para la respuesta de activos.
 *
 * @param {object} params Parámetros de entrada.
 * @param {Record<string, number>} [params.roleCounts={}] Conteos por rol.
 * @param {Record<string, number>} [params.stageCounts={}] Conteos por stage.
 * @param {Record<string, number>} [params.actionCounts={}] Conteos por acción.
 * @param {boolean} [params.includeSmartSortOption=false] Indica si se añade la opción Smart.
 * @param {boolean} [params.includeSortDefault=false] Indica si defaults incluye sort.
 * @returns {Record<string, any>}
 */
export const buildActiveFiltersMeta = ({
  roleCounts = {},
  stageCounts = {},
  actionCounts = {},
  includeSmartSortOption = false,
  includeSortDefault = false,
} = {}) => ({
  defaults: {
    role: "all",
    stage: "all",
    action: "all",
    ...(includeSortDefault ? { sort: "smart" } : {}),
    q: "",
  },
  roleOptions: ACTIVE_ROLE_OPTIONS,
  stageOptions: buildStageOptions(),
  actionOptions: buildActionOptions(),
  sortOptions: buildSortOptions(includeSmartSortOption),
  counts: {
    roles: roleCounts,
    stages: stageCounts,
    actions: actionCounts,
  },
});

/**
 * Construye la metadata agregada de la respuesta de activos.
 *
 * @param {object} params Parámetros de entrada.
 * @param {Array<Record<string, any>>} params.formattedIssues Issues ya formateados.
 * @param {Record<string, Array<Record<string, any>>>} params.tasksByType Tareas agrupadas.
 * @returns {{
 *   tasks: { total: number, byType: Record<string, Array<Record<string, any>>> },
 *   taskCenter: { total: number, sections: Array<Record<string, any>> },
 *   filtersMeta: Record<string, any>,
 * }}
 */
export const buildActiveIssuesResponseMeta = ({
  formattedIssues,
  tasksByType,
}) => {
  const taskCenter = buildActiveTaskCenter(tasksByType);

  const roleCounts = {};
  const stageCounts = {};
  const actionCounts = {};

  for (const issue of formattedIssues || []) {
    incrementCounter(roleCounts, issue.role || "viewer");
    incrementCounter(stageCounts, issue.ui?.stage || issue.currentStage || "unknown");

    const actionKey = issue.ui?.statusKey || issue.nextAction?.key || "none";
    incrementCounter(actionCounts, actionKey);
  }

  return {
    tasks: {
      total: taskCenter.total,
      byType: tasksByType,
    },
    taskCenter,
    filtersMeta: buildActiveFiltersMeta({
      roleCounts,
      stageCounts,
      actionCounts,
      includeSmartSortOption: false,
      includeSortDefault: false,
    }),
  };
};

/**
 * Construye la respuesta vacía estándar para activos.
 *
 * Mantiene el mismo contrato actual de la API cuando no hay issues visibles.
 *
 * @returns {Record<string, any>}
 */
export const buildEmptyActiveIssuesPayload = () => ({
  success: true,
  issues: [],
  tasks: {
    total: 0,
    byType: getEmptyTasksByType(),
  },
  taskCenter: {
    total: 0,
    sections: [],
  },
  filtersMeta: buildActiveFiltersMeta({
    roleCounts: {},
    stageCounts: {},
    actionCounts: {},
    includeSmartSortOption: true,
    includeSortDefault: true,
  }),
});