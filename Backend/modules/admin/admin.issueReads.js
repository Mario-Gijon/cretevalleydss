import mongoose from "mongoose";

// Models
import { Alternative } from "../../models/Alternatives.js";
import { User } from "../../models/Users.js";
import { Consensus } from "../../models/Consensus.js";
import { Criterion } from "../../models/Criteria.js";
import { CriteriaWeightEvaluation } from "../../models/CriteriaWeightEvaluation.js";
import { Evaluation } from "../../models/Evaluations.js";
import { ExitUserIssue } from "../../models/ExitUserIssue.js";
import { IssueExpressionDomain } from "../../models/IssueExpressionDomains.js";
import { Issue } from "../../models/Issues.js";
import { IssueScenario } from "../../models/IssueScenarios.js";
import { Participation } from "../../models/Participations.js";

// Modules
import {
  ensureIssueOrdersDb,
  getOrderedAlternativesDb,
  getOrderedLeafCriteriaDb,
} from "../issues/issue.ordering.js";
import {
  EVALUATION_STRUCTURES,
  resolveEvaluationStructure,
} from "../issues/issue.evaluationStructure.js";

// Utils
import {
  createBadRequestError,
  createNotFoundError,
} from "../../utils/common/errors.js";

const asId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && value._id) return String(value._id);
  return String(value);
};

const sortByNameStable = (a, b) => {
  const byName = String(a?.name || "").localeCompare(
    String(b?.name || ""),
    undefined,
    {
      sensitivity: "base",
      numeric: true,
    }
  );

  if (byName !== 0) return byName;

  return asId(a).localeCompare(asId(b));
};

/**
 * Construye el árbol jerárquico de criterios para el detalle admin del issue.
 *
 * Cada nodo incluye su relación padre-hijos y el resultado se devuelve
 * ordenado de forma estable por nombre para facilitar su renderizado.
 *
 * @param {Array<Record<string, any>>} [criteriaDocs=[]] Criterios del issue.
 * @returns {Array<Record<string, any>>}
 */
const buildCriteriaTreeAdmin = (criteriaDocs = []) => {
  const nodes = criteriaDocs.map((criterion) => ({
    id: asId(criterion._id),
    name: criterion.name,
    type: criterion.type,
    isLeaf: Boolean(criterion.isLeaf),
    parentId: criterion.parentCriterion
      ? asId(criterion.parentCriterion)
      : null,
    children: [],
  }));

  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const roots = [];

  for (const node of nodes) {
    if (node.parentId && nodesById.has(node.parentId)) {
      nodesById.get(node.parentId).children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortRecursively = (items) => {
    items.sort(sortByNameStable);

    items.forEach((item) => {
      if (Array.isArray(item.children) && item.children.length > 0) {
        sortRecursively(item.children);
      }
    });
  };

  sortRecursively(roots);

  return roots;
};

/**
 * Calcula cuántas celdas de evaluación debería completar cada experto.
 *
 * En evaluación directa se espera una celda por alternativa y criterio hoja.
 * En pairwise se espera una comparación por cada alternativa frente al resto
 * para cada criterio hoja.
 *
 * @param {object} params Parámetros de entrada.
 * @param {number} params.alternativesCount Número de alternativas.
 * @param {number} params.leafCriteriaCount Número de criterios hoja.
 * @param {boolean} params.isPairwise Indica si la estructura es pairwise.
 * @returns {number}
 */
const countExpectedEvaluationCellsPerExpert = ({
  alternativesCount,
  leafCriteriaCount,
  isPairwise,
}) => {
  if (!alternativesCount || !leafCriteriaCount) {
    return 0;
  }

  if (isPairwise) {
    return (
      alternativesCount *
      leafCriteriaCount *
      Math.max(alternativesCount - 1, 0)
    );
  }

  return alternativesCount * leafCriteriaCount;
};

/**
 * Devuelve la metadata legible de la etapa actual del issue.
 *
 * @param {string} stage Etapa actual del issue.
 * @returns {{ key: string, label: string }}
 */
const getIssueStageMeta = (stage) => {
  const stageMap = {
    criteriaWeighting: {
      key: "criteriaWeighting",
      label: "Criteria weighting",
    },
    weightsFinished: {
      key: "weightsFinished",
      label: "Weights finished",
    },
    alternativeEvaluation: {
      key: "alternativeEvaluation",
      label: "Alternative evaluation",
    },
    finished: {
      key: "finished",
      label: "Finished",
    },
  };

  return stageMap[stage] || { key: stage, label: stage || "Unknown" };
};

/**
 * Calcula el estado de acciones disponibles para el creador del issue.
 *
 * Estas flags permiten al panel admin saber si el issue puede editar expertos,
 * computar pesos, resolverse o eliminarse según su etapa y el progreso real
 * de los participantes aceptados.
 *
 * @param {object} params Parámetros de entrada.
 * @param {Record<string, any>} params.issue Documento del issue.
 * @param {number} [params.acceptedExperts=0] Número de expertos aceptados.
 * @param {number} [params.pendingExperts=0] Número de expertos pendientes.
 * @param {number} [params.weightsDoneAccepted=0] Expertos aceptados con pesos completados.
 * @param {number} [params.evaluationsDoneAccepted=0] Expertos aceptados con evaluaciones completadas.
 * @returns {{
 *   canEditExperts: boolean,
 *   canRemoveIssue: boolean,
 *   canComputeWeights: boolean,
 *   canResolveIssue: boolean,
 * }}
 */
const getCreatorActionFlags = ({
  issue,
  acceptedExperts = 0,
  pendingExperts = 0,
  weightsDoneAccepted = 0,
  evaluationsDoneAccepted = 0,
}) => {
  const stage = issue?.currentStage;
  const hasPendingExperts = pendingExperts > 0;

  const allWeightsDone =
    acceptedExperts > 0 && weightsDoneAccepted === acceptedExperts;

  const allEvaluationsDone =
    acceptedExperts > 0 && evaluationsDoneAccepted === acceptedExperts;

  return {
    canEditExperts: Boolean(issue?.active),
    canRemoveIssue: Boolean(issue?.active),
    canComputeWeights:
      stage === "weightsFinished" && !hasPendingExperts && allWeightsDone,
    canResolveIssue:
      stage === "alternativeEvaluation" &&
      !hasPendingExperts &&
      allEvaluationsDone,
  };
};

/**
 * Construye el payload público de un experto o usuario participante.
 *
 * Si el usuario ya no existe, devuelve una representación segura para que
 * el detalle admin no rompa el renderizado ni dependa de populate completo.
 *
 * @param {Record<string, any>|null|undefined} expert Usuario poblado.
 * @param {string} [fallbackId=""] Id alternativo cuando no hay documento poblado.
 * @returns {{
 *   id: string,
 *   name: string,
 *   email: string,
 *   role: string,
 *   university: string,
 *   accountConfirm: boolean,
 * }}
 */
const buildParticipantExpertPayload = (expert, fallbackId = "") => {
  if (!expert) {
    return {
      id: fallbackId,
      name: "Deleted user",
      email: "Deleted user",
      role: "user",
      university: "",
      accountConfirm: false,
    };
  }

  return {
    id: asId(expert._id),
    name: expert.name,
    email: expert.email,
    role: expert.role || "user",
    university: expert.university || "",
    accountConfirm: Boolean(expert.accountConfirm),
  };
};

/**
 * Obtiene el detalle completo de un issue para el panel de administración.
 *
 * La respuesta incluye:
 * - datos base del issue
 * - alternativas y criterios ordenados
 * - árbol de criterios
 * - pesos finales
 * - snapshots de dominios
 * - consenso y escenarios
 * - métricas de progreso
 * - participantes actuales y usuarios que ya salieron
 *
 * @param {object} params Parámetros de entrada.
 * @param {string} params.issueId Id del issue.
 * @returns {Promise<{ issue: Record<string, any> }>}
 */
export const getIssueAdminDetailPayload = async ({ issueId }) => {
  if (!issueId || !mongoose.Types.ObjectId.isValid(issueId)) {
    throw createBadRequestError("Valid issue id is required");
  }

  let issue = await Issue.findById(issueId)
    .populate("admin", "name email role accountConfirm")
    .populate(
      "model",
      "name isPairwise evaluationStructure isConsensus isMultiCriteria parameters supportedDomains"
    )
    .lean();

  if (!issue) {
    throw createNotFoundError("Issue not found");
  }

  const orderedIssue = await ensureIssueOrdersDb({ issueId });

  issue = {
    ...issue,
    alternativeOrder:
      orderedIssue?.alternativeOrder || issue.alternativeOrder || [],
    leafCriteriaOrder:
      orderedIssue?.leafCriteriaOrder || issue.leafCriteriaOrder || [],
  };

  const [
    orderedAlternatives,
    orderedLeafCriteria,
    allCriteria,
    participations,
    exits,
    consensusDocs,
    scenarios,
    snapshots,
    evaluationAggByExpert,
    weightDocs,
  ] = await Promise.all([
    getOrderedAlternativesDb({
      issueId,
      issueDoc: issue,
      select: "_id name",
      lean: true,
    }),
    getOrderedLeafCriteriaDb({
      issueId,
      issueDoc: issue,
      select: "_id name type isLeaf parentCriterion",
      lean: true,
    }),
    Criterion.find({ issue: issueId }).lean(),
    Participation.find({ issue: issueId })
      .populate("expert", "name email role university accountConfirm")
      .lean(),
    ExitUserIssue.find({ issue: issueId, hidden: true })
      .populate("user", "name email role university accountConfirm")
      .lean(),
    Consensus.find({ issue: issueId }).sort({ phase: 1 }).lean(),
    IssueScenario.find({ issue: issueId })
      .sort({ createdAt: -1 })
      .select(
        "_id name targetModel targetModelName domainType evaluationStructure isPairwise status createdAt createdBy"
      )
      .populate("createdBy", "name email")
      .lean(),
    IssueExpressionDomain.find({ issue: issueId }).lean(),
    Evaluation.aggregate([
      { $match: { issue: new mongoose.Types.ObjectId(issueId) } },
      {
        $group: {
          _id: "$expert",
          totalDocs: { $sum: 1 },
          filledDocs: {
            $sum: {
              $cond: [
                {
                  $and: [{ $ne: ["$value", null] }, { $ne: ["$value", ""] }],
                },
                1,
                0,
              ],
            },
          },
          lastEvaluationAt: { $max: "$timestamp" },
        },
      },
    ]),
    CriteriaWeightEvaluation.find({ issue: issueId }).lean(),
  ]);

  const issueEvaluationStructure = resolveEvaluationStructure(issue);
  const issueIsPairwise =
    issueEvaluationStructure ===
    EVALUATION_STRUCTURES.PAIRWISE_ALTERNATIVES;

  const alternativesCount = orderedAlternatives.length;
  const leafCriteriaCount = orderedLeafCriteria.length;

  const expectedPerExpert = countExpectedEvaluationCellsPerExpert({
    alternativesCount,
    leafCriteriaCount,
    isPairwise: issueIsPairwise,
  });

  const criteriaTree = buildCriteriaTreeAdmin(allCriteria);

  const finalWeightsArray = Array.isArray(issue.modelParameters?.weights)
    ? issue.modelParameters.weights
    : [];

  const finalWeightsById = {};
  const finalWeightsByName = {};

  orderedLeafCriteria.forEach((criterion, index) => {
    const value = finalWeightsArray[index] ?? null;
    finalWeightsById[asId(criterion._id)] = value;
    finalWeightsByName[criterion.name] = value;
  });

  const evaluationAggMap = new Map(
    evaluationAggByExpert.map((row) => [
      asId(row._id),
      {
        totalDocs: row.totalDocs || 0,
        filledDocs: row.filledDocs || 0,
        lastEvaluationAt: row.lastEvaluationAt || null,
      },
    ])
  );

  const weightDocMap = new Map(
    weightDocs.map((weightDoc) => [asId(weightDoc.expert), weightDoc])
  );

  const exitMap = new Map(
    exits.map((exit) => [
      asId(exit.user?._id || exit.user),
      {
        hidden: Boolean(exit.hidden),
        timestamp: exit.timestamp || null,
        phase: exit.phase ?? null,
        stage: exit.stage ?? null,
        reason: exit.reason ?? null,
        history: Array.isArray(exit.history) ? exit.history : [],
        user: exit.user
          ? {
              id: asId(exit.user._id),
              name: exit.user.name,
              email: exit.user.email,
              role: exit.user.role || "user",
              university: exit.user.university || "",
              accountConfirm: Boolean(exit.user.accountConfirm),
            }
          : null,
      },
    ])
  );

  const participantsDetailed = participations.map((participation) => {
    const expertId = asId(participation.expert?._id || participation.expert);
    const evaluationStats = evaluationAggMap.get(expertId) || {
      totalDocs: 0,
      filledDocs: 0,
      lastEvaluationAt: null,
    };
    const weightDoc = weightDocMap.get(expertId) || null;
    const exitInfo = exitMap.get(expertId) || null;

    return {
      expert: buildParticipantExpertPayload(participation.expert, expertId),
      currentParticipant: true,
      invitationStatus: participation.invitationStatus,
      weightsCompleted: Boolean(participation.weightsCompleted),
      evaluationCompleted: Boolean(participation.evaluationCompleted),
      joinedAt: participation.joinedAt || null,
      entryPhase: participation.entryPhase ?? null,
      entryStage: participation.entryStage ?? null,
      progress: {
        expectedEvaluationCells: expectedPerExpert,
        totalEvaluationDocs: evaluationStats.totalDocs,
        filledEvaluationDocs: evaluationStats.filledDocs,
        evaluationProgressPct:
          expectedPerExpert > 0
            ? Number(
                (
                  (evaluationStats.filledDocs / expectedPerExpert) *
                  100
                ).toFixed(2)
              )
            : 0,
        lastEvaluationAt: evaluationStats.lastEvaluationAt,
        hasWeightDoc: Boolean(weightDoc),
        weightDocCompleted: Boolean(weightDoc?.completed),
        weightDocPhase: weightDoc?.consensusPhase ?? null,
        weightDocUpdatedAt: weightDoc?.updatedAt || null,
      },
      exitInfo,
    };
  });

  const currentParticipantIds = new Set(
    participations.map((participation) =>
      asId(participation.expert?._id || participation.expert)
    )
  );

  const exitedUsersDetailed = exits
    .filter(
      (exit) => !currentParticipantIds.has(asId(exit.user?._id || exit.user))
    )
    .map((exit) => ({
      expert: buildParticipantExpertPayload(exit.user, asId(exit.user)),
      currentParticipant: false,
      exitInfo: {
        hidden: Boolean(exit.hidden),
        timestamp: exit.timestamp || null,
        phase: exit.phase ?? null,
        stage: exit.stage ?? null,
        reason: exit.reason ?? null,
        history: Array.isArray(exit.history) ? exit.history : [],
      },
    }));

  const acceptedExperts = participations.filter(
    (participation) => participation.invitationStatus === "accepted"
  );
  const pendingExperts = participations.filter(
    (participation) => participation.invitationStatus === "pending"
  );
  const declinedExperts = participations.filter(
    (participation) => participation.invitationStatus === "declined"
  );

  const latestConsensus = consensusDocs.length
    ? consensusDocs[consensusDocs.length - 1]
    : null;

  const snapshotsSummary = {
    total: snapshots.length,
    numeric: snapshots.filter((domain) => domain.type === "numeric").length,
    linguistic: snapshots.filter((domain) => domain.type === "linguistic")
      .length,
  };

  const totalFilledEvaluationCells = Array.from(
    evaluationAggMap.values()
  ).reduce((accumulator, row) => accumulator + (row.filledDocs || 0), 0);

  const acceptedExpertsWithWeightsDone = acceptedExperts.filter(
    (item) => item.weightsCompleted
  ).length;

  const acceptedExpertsWithEvaluationsDone = acceptedExperts.filter(
    (item) => item.evaluationCompleted
  ).length;

  return {
    issue: {
      id: asId(issue._id),
      name: issue.name,
      description: issue.description,
      active: Boolean(issue.active),
      currentStage: issue.currentStage,
      currentStageMeta: getIssueStageMeta(issue.currentStage),
      weightingMode: issue.weightingMode,
      isConsensus: Boolean(issue.isConsensus),
      consensusMaxPhases: issue.consensusMaxPhases ?? null,
      consensusThreshold: issue.consensusThreshold ?? null,
      creationDate: issue.creationDate || null,
      closureDate: issue.closureDate || null,
      admin: issue.admin
        ? {
            id: asId(issue.admin._id),
            name: issue.admin.name,
            email: issue.admin.email,
            role: issue.admin.role || "user",
            accountConfirm: Boolean(issue.admin.accountConfirm),
          }
        : null,
      model: issue.model
        ? {
            id: asId(issue.model._id),
            name: issue.model.name,
            isPairwise: issueIsPairwise,
            isConsensus: Boolean(issue.model.isConsensus),
            isMultiCriteria: Boolean(issue.model.isMultiCriteria),
            supportedDomains: issue.model.supportedDomains || {},
            parameters: issue.model.parameters || [],
          }
        : null,
      alternatives: orderedAlternatives.map((alternative) => ({
        id: asId(alternative._id),
        name: alternative.name,
      })),
      criteria: criteriaTree,
      leafCriteria: orderedLeafCriteria.map((criterion) => ({
        id: asId(criterion._id),
        name: criterion.name,
        type: criterion.type,
      })),
      finalWeights: finalWeightsByName,
      finalWeightsById,
      modelParameters: issue.modelParameters || {},
      snapshots: snapshotsSummary,
      consensus: {
        rounds: consensusDocs.length,
        latestPhase: latestConsensus?.phase || 0,
        latestLevel: latestConsensus?.level ?? null,
        latestAt: latestConsensus?.timestamp || null,
      },
      scenarios: scenarios.map((scenario) => ({
        id: asId(scenario._id),
        name: scenario.name || "",
        targetModelId: asId(scenario.targetModel),
        targetModelName: scenario.targetModelName || "",
        domainType: scenario.domainType || null,
        isPairwise:
          resolveEvaluationStructure(scenario) ===
          EVALUATION_STRUCTURES.PAIRWISE_ALTERNATIVES,
        status: scenario.status || "done",
        createdAt: scenario.createdAt || null,
        createdBy: scenario.createdBy
          ? {
              id: asId(scenario.createdBy._id),
              name: scenario.createdBy.name,
              email: scenario.createdBy.email,
            }
          : null,
      })),
      metrics: {
        totalAlternatives: alternativesCount,
        totalCriteria: allCriteria.length,
        totalLeafCriteria: leafCriteriaCount,
        totalExperts: participations.length,
        acceptedExperts: acceptedExperts.length,
        pendingExperts: pendingExperts.length,
        declinedExperts: declinedExperts.length,
        weightsDoneAccepted: acceptedExpertsWithWeightsDone,
        evaluationsDoneAccepted: acceptedExpertsWithEvaluationsDone,
        expectedEvaluationCellsPerExpert: expectedPerExpert,
        totalFilledEvaluationCells,
      },
      creatorActionsState: getCreatorActionFlags({
        issue,
        acceptedExperts: acceptedExperts.length,
        pendingExperts: pendingExperts.length,
        weightsDoneAccepted: acceptedExpertsWithWeightsDone,
        evaluationsDoneAccepted: acceptedExpertsWithEvaluationsDone,
      }),
      participants: participantsDetailed.sort((a, b) =>
        String(a.expert?.email || a.expert?.name || "").localeCompare(
          String(b.expert?.email || b.expert?.name || ""),
          undefined,
          { sensitivity: "base" }
        )
      ),
      exitedUsers: exitedUsersDetailed.sort((a, b) =>
        String(a.expert?.email || a.expert?.name || "").localeCompare(
          String(b.expert?.email || b.expert?.name || ""),
          undefined,
          { sensitivity: "base" }
        )
      ),
    },
  };
};

/**
 * Construye una fila de progreso de experto para el panel admin.
 *
 * La fila sirve tanto para participantes actuales como para usuarios que ya
 * salieron del issue, manteniendo una estructura homogénea para la UI.
 *
 * @param {object} params Parámetros de entrada.
 * @param {Record<string, any>|null|undefined} params.expert Usuario poblado.
 * @param {string} params.expertId Id normalizado del experto.
 * @param {boolean} params.currentParticipant Indica si sigue participando.
 * @param {Record<string, any>|null} [params.participation=null] Participación actual.
 * @param {Record<string, any>|null} [params.exit=null] Documento de salida.
 * @param {{ totalDocs: number, filledDocs: number, lastEvaluationAt: Date | null }} params.evaluationStats Estadísticas de evaluación.
 * @param {Record<string, any>|null} [params.weightDoc=null] Documento de pesos del experto.
 * @param {number} params.expectedEvaluationCells Número esperado de celdas de evaluación.
 * @returns {Record<string, any>}
 */
const buildExpertProgressRow = ({
  expert,
  expertId,
  currentParticipant,
  participation = null,
  exit = null,
  evaluationStats,
  weightDoc = null,
  expectedEvaluationCells,
}) => ({
  expert: buildParticipantExpertPayload(expert, expertId),
  currentParticipant,
  invitationStatus: currentParticipant
    ? participation?.invitationStatus || "pending"
    : "exited",
  weightsCompleted: currentParticipant
    ? Boolean(participation?.weightsCompleted)
    : Boolean(weightDoc?.completed),
  evaluationCompleted: currentParticipant
    ? Boolean(participation?.evaluationCompleted)
    : false,
  joinedAt: currentParticipant ? participation?.joinedAt || null : null,
  entryPhase: currentParticipant ? participation?.entryPhase ?? null : null,
  entryStage: currentParticipant ? participation?.entryStage ?? null : null,
  exitInfo: exit
    ? {
        hidden: Boolean(exit.hidden),
        timestamp: exit.timestamp || null,
        phase: exit.phase ?? null,
        stage: exit.stage ?? null,
        reason: exit.reason ?? null,
      }
    : null,
  progress: {
    expectedEvaluationCells,
    totalEvaluationDocs: evaluationStats.totalDocs || 0,
    filledEvaluationDocs: evaluationStats.filledDocs || 0,
    evaluationProgressPct:
      expectedEvaluationCells > 0
        ? Number(
            (
              ((evaluationStats.filledDocs || 0) / expectedEvaluationCells) *
              100
            ).toFixed(2)
          )
        : 0,
    lastEvaluationAt: evaluationStats.lastEvaluationAt || null,
    hasWeightDoc: Boolean(weightDoc),
    weightDocCompleted: Boolean(weightDoc?.completed),
    weightDocPhase: weightDoc?.consensusPhase ?? null,
    weightDocUpdatedAt: weightDoc?.updatedAt || null,
  },
});

/**
 * Obtiene una vista resumida del progreso de expertos en un issue para admin.
 *
 * La respuesta incluye:
 * - metadata básica del issue
 * - estructura de evaluación resuelta
 * - progreso de participantes actuales
 * - usuarios que ya salieron del issue
 * - resumen de documentos de evaluación y pesos por experto
 *
 * @param {object} params Parámetros de entrada.
 * @param {string} params.issueId Id del issue.
 * @returns {Promise<{ issue: Record<string, any>, experts: Array<Record<string, any>> }>}
 */
export const getIssueExpertsProgressPayload = async ({ issueId }) => {
  if (!issueId || !mongoose.Types.ObjectId.isValid(issueId)) {
    throw createBadRequestError("Valid issue id is required");
  }

  let issue = await Issue.findById(issueId)
    .populate("model", "name isPairwise evaluationStructure")
    .lean();

  if (!issue) {
    throw createNotFoundError("Issue not found");
  }

  const orderedIssue = await ensureIssueOrdersDb({ issueId });

  issue = {
    ...issue,
    alternativeOrder:
      orderedIssue?.alternativeOrder || issue.alternativeOrder || [],
    leafCriteriaOrder:
      orderedIssue?.leafCriteriaOrder || issue.leafCriteriaOrder || [],
  };

  const [
    alternatives,
    leafCriteria,
    participations,
    exits,
    evaluationAgg,
    weightDocs,
  ] = await Promise.all([
    getOrderedAlternativesDb({
      issueId,
      issueDoc: issue,
      select: "_id name",
      lean: true,
    }),
    getOrderedLeafCriteriaDb({
      issueId,
      issueDoc: issue,
      select: "_id name",
      lean: true,
    }),
    Participation.find({ issue: issueId })
      .populate("expert", "name email role university accountConfirm")
      .lean(),
    ExitUserIssue.find({ issue: issueId, hidden: true })
      .populate("user", "name email role university accountConfirm")
      .lean(),
    Evaluation.aggregate([
      { $match: { issue: new mongoose.Types.ObjectId(issueId) } },
      {
        $group: {
          _id: "$expert",
          totalDocs: { $sum: 1 },
          filledDocs: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$value", null] },
                    { $ne: ["$value", ""] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          lastEvaluationAt: { $max: "$timestamp" },
        },
      },
    ]),
    CriteriaWeightEvaluation.find({ issue: issueId }).lean(),
  ]);

  const evaluationStructure = resolveEvaluationStructure(issue);
  const isPairwise =
    evaluationStructure ===
    EVALUATION_STRUCTURES.PAIRWISE_ALTERNATIVES;

  const expectedPerExpert = countExpectedEvaluationCellsPerExpert({
    alternativesCount: alternatives.length,
    leafCriteriaCount: leafCriteria.length,
    isPairwise,
  });

  const evaluationMap = new Map(
    evaluationAgg.map((row) => [
      asId(row._id),
      {
        totalDocs: row.totalDocs || 0,
        filledDocs: row.filledDocs || 0,
        lastEvaluationAt: row.lastEvaluationAt || null,
      },
    ])
  );

  const weightMap = new Map(
    weightDocs.map((weightDoc) => [asId(weightDoc.expert), weightDoc])
  );

  const currentParticipantIds = new Set(
    participations.map((participation) =>
      asId(participation.expert?._id || participation.expert)
    )
  );

  const rows = participations.map((participation) => {
    const expertId = asId(participation.expert?._id || participation.expert);

    return buildExpertProgressRow({
      expert: participation.expert,
      expertId,
      currentParticipant: true,
      participation,
      evaluationStats: evaluationMap.get(expertId) || {
        totalDocs: 0,
        filledDocs: 0,
        lastEvaluationAt: null,
      },
      weightDoc: weightMap.get(expertId) || null,
      expectedEvaluationCells: expectedPerExpert,
    });
  });

  for (const exit of exits) {
    const expertId = asId(exit.user?._id || exit.user);

    if (currentParticipantIds.has(expertId)) {
      continue;
    }

    rows.push(
      buildExpertProgressRow({
        expert: exit.user,
        expertId,
        currentParticipant: false,
        exit,
        evaluationStats: evaluationMap.get(expertId) || {
          totalDocs: 0,
          filledDocs: 0,
          lastEvaluationAt: null,
        },
        weightDoc: weightMap.get(expertId) || null,
        expectedEvaluationCells: expectedPerExpert,
      })
    );
  }

  rows.sort((a, b) => {
    if (a.currentParticipant !== b.currentParticipant) {
      return a.currentParticipant ? -1 : 1;
    }

    return String(a.expert?.email || a.expert?.name || "").localeCompare(
      String(b.expert?.email || b.expert?.name || ""),
      undefined,
      { sensitivity: "base" }
    );
  });

  return {
    issue: {
      id: asId(issue._id),
      name: issue.name,
      currentStage: issue.currentStage,
      weightingMode: issue.weightingMode,
      active: Boolean(issue.active),
      evaluationStructure,
      isPairwise,
      model: issue.model
        ? {
            id: asId(issue.model._id),
            name: issue.model.name,
          }
        : null,
    },
    experts: rows,
  };
};

/**
 * Comprueba si una celda de evaluación contiene un valor real.
 *
 * @param {*} value Valor almacenado en la evaluación.
 * @returns {boolean}
 */
const isFilledValue = (value) =>
  !(value === null || value === undefined || value === "");

/**
 * Ordena un objeto siguiendo un orden fijo de claves.
 *
 * Se usa para devolver matrices pairwise con columnas estables
 * y predecibles para el frontend.
 *
 * @param {Record<string, any>} [obj={}] Objeto a ordenar.
 * @param {string[]} [orderedKeys=[]] Orden deseado de claves.
 * @returns {Record<string, any>}
 */
const orderObjectByKeys = (obj = {}, orderedKeys = []) => {
  const orderedObject = {};
  const usedKeys = new Set();

  for (const key of orderedKeys) {
    orderedObject[key] = Object.prototype.hasOwnProperty.call(obj, key)
      ? obj[key]
      : null;
    usedKeys.add(key);
  }

  for (const [key, value] of Object.entries(obj || {})) {
    if (!usedKeys.has(key)) {
      orderedObject[key] = value;
    }
  }

  return orderedObject;
};

/**
 * Formatea un snapshot de dominio de expresión para consumo del frontend admin.
 *
 * @param {Record<string, any>|null} domain Snapshot del dominio.
 * @returns {Record<string, any>|null}
 */
const formatIssueSnapshotDomain = (domain) => {
  if (!domain) return null;

  return {
    id: asId(domain._id),
    name: domain.name,
    type: domain.type,
    ...(domain.type === "numeric" && {
      range: {
        min: domain.numericRange?.min ?? null,
        max: domain.numericRange?.max ?? null,
      },
    }),
    ...(domain.type === "linguistic" && {
      labels: Array.isArray(domain.linguisticLabels)
        ? domain.linguisticLabels
        : [],
    }),
  };
};

/**
 * Construye el payload resumido de participación del experto para admin.
 *
 * @param {Record<string, any>|null} participation Documento de participación.
 * @returns {Record<string, any>|null}
 */
const buildAdminExpertParticipationPayload = (participation) => {
  if (!participation) {
    return null;
  }

  return {
    invitationStatus: participation.invitationStatus,
    weightsCompleted: Boolean(participation.weightsCompleted),
    evaluationCompleted: Boolean(participation.evaluationCompleted),
    joinedAt: participation.joinedAt || null,
    entryPhase: participation.entryPhase ?? null,
    entryStage: participation.entryStage ?? null,
  };
};

/**
 * Construye el payload base de experto para vistas admin.
 *
 * @param {Record<string, any>|null} expert Usuario poblado.
 * @param {string} fallbackId Id alternativo cuando el usuario ya no existe.
 * @returns {Record<string, any>}
 */
const buildAdminExpertIdentityPayload = (expert, fallbackId) =>
  buildParticipantExpertPayload(expert, fallbackId);

/**
 * Obtiene las evaluaciones de un experto en modo solo lectura para admin.
 *
 * La respuesta soporta tanto estructuras directas como pairwise y devuelve:
 * - metadata básica del issue
 * - datos del experto
 * - estado de participación
 * - estadísticas de progreso
 * - evaluaciones formateadas para la UI
 * - evaluaciones colectivas de la última fase de consenso, si existen
 *
 * @param {object} params Parámetros de entrada.
 * @param {string} params.issueId Id del issue.
 * @param {string} params.expertId Id del experto.
 * @returns {Promise<{
 *   issue: Record<string, any>,
 *   expert: Record<string, any>,
 *   participation: Record<string, any>|null,
 *   stats: {
 *     expectedCells: number,
 *     filledCells: number,
 *     lastEvaluationAt: Date | null,
 *   },
 *   evaluations: Record<string, any>,
 *   collectiveEvaluations: any,
 * }>}
 */
export const getIssueExpertEvaluationsPayload = async ({
  issueId,
  expertId,
}) => {
  if (!issueId || !mongoose.Types.ObjectId.isValid(issueId)) {
    throw createBadRequestError("Valid issue id is required");
  }

  if (!expertId || !mongoose.Types.ObjectId.isValid(expertId)) {
    throw createBadRequestError("Valid expert id is required");
  }

  let issue = await Issue.findById(issueId)
    .populate("model", "name isPairwise evaluationStructure")
    .lean();

  if (!issue) {
    throw createNotFoundError("Issue not found");
  }

  const orderedIssue = await ensureIssueOrdersDb({ issueId });

  issue = {
    ...issue,
    alternativeOrder:
      orderedIssue?.alternativeOrder || issue.alternativeOrder || [],
    leafCriteriaOrder:
      orderedIssue?.leafCriteriaOrder || issue.leafCriteriaOrder || [],
  };

  const [
    expert,
    participation,
    latestConsensus,
    orderedAlternatives,
    orderedLeafCriteria,
  ] = await Promise.all([
    User.findById(expertId)
      .select("name email role university accountConfirm")
      .lean(),
    Participation.findOne({ issue: issueId, expert: expertId }).lean(),
    Consensus.findOne({ issue: issueId }).sort({ phase: -1 }).lean(),
    getOrderedAlternativesDb({
      issueId,
      issueDoc: issue,
      select: "_id name",
      lean: true,
    }),
    getOrderedLeafCriteriaDb({
      issueId,
      issueDoc: issue,
      select: "_id name type",
      lean: true,
    }),
  ]);

  const evaluationStructure = resolveEvaluationStructure(issue);
  const isPairwise =
    evaluationStructure ===
    EVALUATION_STRUCTURES.PAIRWISE_ALTERNATIVES;

  if (isPairwise) {
    const evaluationDocs = await Evaluation.find({
      issue: issueId,
      expert: expertId,
      comparedAlternative: { $ne: null },
    })
      .populate("alternative", "name")
      .populate("comparedAlternative", "name")
      .populate("criterion", "name")
      .populate("expressionDomain")
      .lean();

    if (!participation && !expert && evaluationDocs.length === 0) {
      throw createNotFoundError("Expert data for this issue not found");
    }

    const evaluations = {};
    const orderedAlternativeNames = orderedAlternatives.map(
      (alternative) => alternative.name
    );

    for (const criterion of orderedLeafCriteria) {
      evaluations[criterion.name] = orderedAlternatives.map((alternative) => ({
        id: alternative.name,
      }));
    }

    const rowMap = new Map();

    for (const criterion of orderedLeafCriteria) {
      for (const alternative of orderedAlternatives) {
        rowMap.set(
          `${criterion.name}__${alternative.name}`,
          evaluations[criterion.name].find(
            (row) => row.id === alternative.name
          )
        );
      }
    }

    let lastEvaluationAt = null;
    let filledCells = 0;

    for (const doc of evaluationDocs) {
      const criterionName = doc.criterion?.name;
      const alternativeName = doc.alternative?.name;
      const comparedAlternativeName = doc.comparedAlternative?.name;

      if (!criterionName || !alternativeName || !comparedAlternativeName) {
        continue;
      }

      const row = rowMap.get(`${criterionName}__${alternativeName}`);
      if (!row) continue;

      row[comparedAlternativeName] = {
        value: doc?.value ?? "",
        domain: formatIssueSnapshotDomain(doc?.expressionDomain || null),
        timestamp: doc?.timestamp || null,
        consensusPhase: doc?.consensusPhase ?? null,
      };

      if (isFilledValue(doc.value)) {
        filledCells += 1;
      }

      if (
        doc.timestamp &&
        (!lastEvaluationAt ||
          new Date(doc.timestamp) > new Date(lastEvaluationAt))
      ) {
        lastEvaluationAt = doc.timestamp;
      }
    }

    for (const criterionName of Object.keys(evaluations)) {
      evaluations[criterionName] = evaluations[criterionName].map((row) =>
        orderObjectByKeys(row, ["id", ...orderedAlternativeNames])
      );
    }

    return {
      issue: {
        id: asId(issue._id),
        name: issue.name,
        currentStage: issue.currentStage,
        weightingMode: issue.weightingMode,
        active: Boolean(issue.active),
        evaluationStructure,
        isPairwise: true,
      },
      expert: buildAdminExpertIdentityPayload(expert, expertId),
      participation: buildAdminExpertParticipationPayload(participation),
      stats: {
        expectedCells: countExpectedEvaluationCellsPerExpert({
          alternativesCount: orderedAlternatives.length,
          leafCriteriaCount: orderedLeafCriteria.length,
          isPairwise: true,
        }),
        filledCells,
        lastEvaluationAt,
      },
      evaluations,
      collectiveEvaluations: latestConsensus?.collectiveEvaluations || null,
    };
  }

  const evaluationDocs = await Evaluation.find({
    issue: issueId,
    expert: expertId,
    comparedAlternative: null,
  })
    .populate("alternative", "name")
    .populate("criterion", "name")
    .populate("expressionDomain")
    .lean();

  if (!participation && !expert && evaluationDocs.length === 0) {
    throw createNotFoundError("Expert data for this issue not found");
  }

  const evaluations = {};
  const evaluationMap = new Map();

  let lastEvaluationAt = null;
  let filledCells = 0;

  for (const doc of evaluationDocs) {
    const alternativeId = asId(doc.alternative?._id || doc.alternative);
    const criterionId = asId(doc.criterion?._id || doc.criterion);

    evaluationMap.set(`${alternativeId}__${criterionId}`, doc);

    if (isFilledValue(doc.value)) {
      filledCells += 1;
    }

    if (
      doc.timestamp &&
      (!lastEvaluationAt || new Date(doc.timestamp) > new Date(lastEvaluationAt))
    ) {
      lastEvaluationAt = doc.timestamp;
    }
  }

  for (const alternative of orderedAlternatives) {
    evaluations[alternative.name] = {};

    for (const criterion of orderedLeafCriteria) {
      const doc = evaluationMap.get(
        `${asId(alternative._id)}__${asId(criterion._id)}`
      );

      evaluations[alternative.name][criterion.name] = {
        value: doc?.value ?? "",
        domain: formatIssueSnapshotDomain(doc?.expressionDomain || null),
        timestamp: doc?.timestamp || null,
        consensusPhase: doc?.consensusPhase ?? null,
      };
    }
  }

  return {
    issue: {
      id: asId(issue._id),
      name: issue.name,
      currentStage: issue.currentStage,
      weightingMode: issue.weightingMode,
      active: Boolean(issue.active),
      evaluationStructure,
      isPairwise: false,
    },
    expert: buildAdminExpertIdentityPayload(expert, expertId),
    participation: buildAdminExpertParticipationPayload(participation),
    stats: {
      expectedCells: countExpectedEvaluationCellsPerExpert({
        alternativesCount: orderedAlternatives.length,
        leafCriteriaCount: orderedLeafCriteria.length,
        isPairwise: false,
      }),
      filledCells,
      lastEvaluationAt,
    },
    evaluations,
    collectiveEvaluations: latestConsensus?.collectiveEvaluations || null,
  };
};

/**
 * Obtiene los pesos de un experto en modo solo lectura para administración.
 *
 * La respuesta incluye:
 * - metadata básica del issue
 * - datos del experto
 * - estado de participación
 * - criterios hoja ordenados
 * - pesos manuales o BWM del experto
 * - pesos finales resueltos del issue, si existen
 *
 * @param {object} params Parámetros de entrada.
 * @param {string} params.issueId Id del issue.
 * @param {string} params.expertId Id del experto.
 * @returns {Promise<{
 *   issue: Record<string, any>,
 *   expert: Record<string, any>,
 *   participation: Record<string, any>|null,
 *   weights: {
 *     kind: string,
 *     leafCriteria: string[],
 *     singleLeafAutoWeights: Record<string, any>|null,
 *     resolvedWeights: Record<string, any>|null,
 *     manualWeights: Record<string, any>,
 *     bwm: {
 *       bestCriterion: string,
 *       worstCriterion: string,
 *       bestToOthers: Record<string, any>,
 *       othersToWorst: Record<string, any>,
 *     },
 *     docMeta: {
 *       completed: boolean,
 *       consensusPhase: number | null,
 *       updatedAt: Date | null,
 *     } | null,
 *   },
 * }>}
 */
export const getIssueExpertWeightsPayload = async ({
  issueId,
  expertId,
}) => {
  if (!issueId || !mongoose.Types.ObjectId.isValid(issueId)) {
    throw createBadRequestError("Valid issue id is required");
  }

  if (!expertId || !mongoose.Types.ObjectId.isValid(expertId)) {
    throw createBadRequestError("Valid expert id is required");
  }

  let issue = await Issue.findById(issueId)
    .populate("model", "name isPairwise evaluationStructure")
    .lean();

  if (!issue) {
    throw createNotFoundError("Issue not found");
  }

  const orderedIssue = await ensureIssueOrdersDb({ issueId });

  issue = {
    ...issue,
    alternativeOrder:
      orderedIssue?.alternativeOrder || issue.alternativeOrder || [],
    leafCriteriaOrder:
      orderedIssue?.leafCriteriaOrder || issue.leafCriteriaOrder || [],
  };

  const [expert, participation, orderedLeafCriteria, weightDoc] =
    await Promise.all([
      User.findById(expertId)
        .select("name email role university accountConfirm")
        .lean(),
      Participation.findOne({ issue: issueId, expert: expertId }).lean(),
      getOrderedLeafCriteriaDb({
        issueId,
        issueDoc: issue,
        select: "_id name type",
        lean: true,
      }),
      CriteriaWeightEvaluation.findOne({
        issue: issueId,
        expert: expertId,
      }).lean(),
    ]);

  if (!expert && !participation && !weightDoc) {
    throw createNotFoundError("Expert weight data for this issue not found");
  }

  const leafNames = orderedLeafCriteria.map((criterion) => criterion.name);

  const resolvedWeights =
    Array.isArray(issue.modelParameters?.weights) &&
    issue.modelParameters.weights.length
      ? leafNames.reduce((accumulator, name, index) => {
          accumulator[name] = issue.modelParameters.weights[index] ?? null;
          return accumulator;
        }, {})
      : null;

  const manualWeights = weightDoc
    ? orderObjectByKeys(weightDoc.manualWeights || {}, leafNames)
    : orderObjectByKeys({}, leafNames);

  const bwm = {
    bestCriterion: weightDoc?.bestCriterion || "",
    worstCriterion: weightDoc?.worstCriterion || "",
    bestToOthers: orderObjectByKeys(weightDoc?.bestToOthers || {}, leafNames),
    othersToWorst: orderObjectByKeys(weightDoc?.othersToWorst || {}, leafNames),
  };

  let kind = "unknown";

  if (leafNames.length === 1) {
    kind = "singleLeaf";
  } else if (issue.weightingMode === "consensus") {
    kind = "manualConsensus";
  } else if (
    ["bwm", "consensusBwm", "simulatedConsensusBwm"].includes(
      issue.weightingMode
    )
  ) {
    kind = "bwm";
  } else if (
    Array.isArray(issue.modelParameters?.weights) &&
    issue.modelParameters.weights.length
  ) {
    kind = "directWeights";
  }

  return {
    issue: {
      id: asId(issue._id),
      name: issue.name,
      currentStage: issue.currentStage,
      weightingMode: issue.weightingMode,
      active: Boolean(issue.active),
      evaluationStructure: resolveEvaluationStructure(issue),
      model: issue.model
        ? {
            id: asId(issue.model._id),
            name: issue.model.name,
            isPairwise:
              resolveEvaluationStructure(issue) ===
              EVALUATION_STRUCTURES.PAIRWISE_ALTERNATIVES,
          }
        : null,
    },
    expert: buildAdminExpertIdentityPayload(expert, expertId),
    participation: buildAdminExpertParticipationPayload(participation),
    weights: {
      kind,
      leafCriteria: leafNames,
      singleLeafAutoWeights:
        leafNames.length === 1
          ? {
              [leafNames[0]]: resolvedWeights?.[leafNames[0]] ?? 1,
            }
          : null,
      resolvedWeights,
      manualWeights,
      bwm,
      docMeta: weightDoc
        ? {
            completed: Boolean(weightDoc.completed),
            consensusPhase: weightDoc.consensusPhase ?? null,
            updatedAt: weightDoc.updatedAt || null,
          }
        : null,
    },
  };
};

/**
 * Construye el filtro del listado de issues para el panel de administración.
 *
 * Mantiene el mismo comportamiento actual:
 * - búsqueda por nombre o descripción
 * - filtros opcionales por activo, etapa, consenso, admin y modelo
 * - ids inválidos de admin/model simplemente se ignoran
 *
 * @param {object} params Parámetros de entrada.
 * @param {string} [params.search=""] Texto de búsqueda.
 * @param {string} [params.active="all"] Filtro de activo: all | true | false.
 * @param {string} [params.currentStage="all"] Etapa actual o all.
 * @param {string} [params.isConsensus="all"] Filtro de consenso: all | true | false.
 * @param {string} [params.adminId=""] Id del admin responsable.
 * @param {string} [params.modelId=""] Id del modelo.
 * @returns {Record<string, any>}
 */
const buildAdminIssuesFilter = ({
  search = "",
  active = "all",
  currentStage = "all",
  isConsensus = "all",
  adminId = "",
  modelId = "",
}) => {
  const normalizedSearch = String(search || "").trim();
  const normalizedActive = String(active || "all").trim().toLowerCase();
  const normalizedStage = String(currentStage || "all").trim();
  const normalizedConsensus = String(isConsensus || "all").trim().toLowerCase();
  const normalizedAdminId = String(adminId || "").trim();
  const normalizedModelId = String(modelId || "").trim();

  const filter = {};

  if (normalizedSearch) {
    filter.$or = [
      { name: { $regex: normalizedSearch, $options: "i" } },
      { description: { $regex: normalizedSearch, $options: "i" } },
    ];
  }

  if (normalizedActive === "true") {
    filter.active = true;
  } else if (normalizedActive === "false") {
    filter.active = false;
  }

  if (normalizedStage && normalizedStage !== "all") {
    filter.currentStage = normalizedStage;
  }

  if (normalizedConsensus === "true") {
    filter.isConsensus = true;
  } else if (normalizedConsensus === "false") {
    filter.isConsensus = false;
  }

  if (
    normalizedAdminId &&
    mongoose.Types.ObjectId.isValid(normalizedAdminId)
  ) {
    filter.admin = normalizedAdminId;
  }

  if (
    normalizedModelId &&
    mongoose.Types.ObjectId.isValid(normalizedModelId)
  ) {
    filter.model = normalizedModelId;
  }

  return filter;
};

/**
 * Obtiene el listado resumido de issues para el panel de administración.
 *
 * La respuesta incluye:
 * - datos base del issue
 * - metadata legible de etapa
 * - estructura de evaluación resuelta
 * - datos base de admin y modelo
 * - métricas agregadas de alternativas, criterios hoja, expertos, consenso,
 *   escenarios y evaluaciones
 * - estado de acciones disponibles para el creador
 *
 * @param {object} params Parámetros de entrada.
 * @param {string} [params.search=""] Texto de búsqueda.
 * @param {string} [params.active="all"] Filtro de activo: all | true | false.
 * @param {string} [params.currentStage="all"] Etapa actual o all.
 * @param {string} [params.isConsensus="all"] Filtro de consenso: all | true | false.
 * @param {string} [params.adminId=""] Id del admin responsable.
 * @param {string} [params.modelId=""] Id del modelo.
 * @returns {Promise<{ issues: Array<Record<string, any>> }>}
 */
export const getAdminIssuesListPayload = async ({
  search = "",
  active = "all",
  currentStage = "all",
  isConsensus = "all",
  adminId = "",
  modelId = "",
}) => {
  const filter = buildAdminIssuesFilter({
    search,
    active,
    currentStage,
    isConsensus,
    adminId,
    modelId,
  });

  const issues = await Issue.find(filter)
    .populate("admin", "name email role accountConfirm")
    .populate(
      "model",
      "name isPairwise evaluationStructure isConsensus isMultiCriteria"
    )
    .sort({ active: -1, creationDate: -1, name: 1 })
    .lean();

  if (!issues.length) {
    return {
      issues: [],
    };
  }

  const issueIds = issues.map((issue) => issue._id);

  const [
    alternativesAgg,
    leafCriteriaAgg,
    participationsAgg,
    consensusAgg,
    scenariosAgg,
    evaluationsAgg,
  ] = await Promise.all([
    Alternative.aggregate([
      { $match: { issue: { $in: issueIds } } },
      {
        $group: {
          _id: "$issue",
          total: { $sum: 1 },
        },
      },
    ]),

    Criterion.aggregate([
      { $match: { issue: { $in: issueIds }, isLeaf: true } },
      {
        $group: {
          _id: "$issue",
          total: { $sum: 1 },
        },
      },
    ]),

    Participation.aggregate([
      { $match: { issue: { $in: issueIds } } },
      {
        $group: {
          _id: "$issue",
          totalExperts: { $sum: 1 },
          acceptedExperts: {
            $sum: {
              $cond: [{ $eq: ["$invitationStatus", "accepted"] }, 1, 0],
            },
          },
          pendingExperts: {
            $sum: {
              $cond: [{ $eq: ["$invitationStatus", "pending"] }, 1, 0],
            },
          },
          declinedExperts: {
            $sum: {
              $cond: [{ $eq: ["$invitationStatus", "declined"] }, 1, 0],
            },
          },
          weightsDoneAccepted: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$invitationStatus", "accepted"] },
                    { $eq: ["$weightsCompleted", true] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          evaluationsDoneAccepted: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$invitationStatus", "accepted"] },
                    { $eq: ["$evaluationCompleted", true] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]),

    Consensus.aggregate([
      { $match: { issue: { $in: issueIds } } },
      {
        $group: {
          _id: "$issue",
          totalRounds: { $sum: 1 },
          latestPhase: { $max: "$phase" },
          latestTimestamp: { $max: "$timestamp" },
        },
      },
    ]),

    IssueScenario.aggregate([
      { $match: { issue: { $in: issueIds } } },
      {
        $group: {
          _id: "$issue",
          total: { $sum: 1 },
        },
      },
    ]),

    Evaluation.aggregate([
      { $match: { issue: { $in: issueIds } } },
      {
        $group: {
          _id: "$issue",
          filledCells: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$value", null] },
                    { $ne: ["$value", ""] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          lastEvaluationAt: { $max: "$timestamp" },
        },
      },
    ]),
  ]);

  const alternativesMap = new Map(
    alternativesAgg.map((row) => [asId(row._id), row.total || 0])
  );

  const leafCriteriaMap = new Map(
    leafCriteriaAgg.map((row) => [asId(row._id), row.total || 0])
  );

  const participationsMap = new Map(
    participationsAgg.map((row) => [asId(row._id), row])
  );

  const consensusMap = new Map(
    consensusAgg.map((row) => [asId(row._id), row])
  );

  const scenariosMap = new Map(
    scenariosAgg.map((row) => [asId(row._id), row.total || 0])
  );

  const evaluationsMap = new Map(
    evaluationsAgg.map((row) => [asId(row._id), row])
  );

  return {
    issues: issues.map((issue) => {
      const issueId = asId(issue._id);

      const totalAlternatives = alternativesMap.get(issueId) || 0;
      const totalLeafCriteria = leafCriteriaMap.get(issueId) || 0;

      const participationStats = participationsMap.get(issueId) || {
        totalExperts: 0,
        acceptedExperts: 0,
        pendingExperts: 0,
        declinedExperts: 0,
        weightsDoneAccepted: 0,
        evaluationsDoneAccepted: 0,
      };

      const consensusStats = consensusMap.get(issueId) || {
        totalRounds: 0,
        latestPhase: 0,
        latestTimestamp: null,
      };

      const evaluationStats = evaluationsMap.get(issueId) || {
        filledCells: 0,
        lastEvaluationAt: null,
      };

      const evaluationStructure =
        issue.evaluationStructure || resolveEvaluationStructure(issue.model);

      const isPairwise =
        evaluationStructure ===
        EVALUATION_STRUCTURES.PAIRWISE_ALTERNATIVES;

      const modelEvaluationStructure = issue.model
        ? resolveEvaluationStructure(issue.model)
        : null;

      const expectedPerExpert = countExpectedEvaluationCellsPerExpert({
        alternativesCount: totalAlternatives,
        leafCriteriaCount: totalLeafCriteria,
        isPairwise,
      });

      return {
        id: issueId,
        name: issue.name,
        description: issue.description,
        active: Boolean(issue.active),
        currentStage: issue.currentStage,
        currentStageMeta: getIssueStageMeta(issue.currentStage),
        weightingMode: issue.weightingMode,
        isConsensus: Boolean(issue.isConsensus),
        consensusMaxPhases: issue.consensusMaxPhases ?? null,
        consensusThreshold: issue.consensusThreshold ?? null,
        creationDate: issue.creationDate || null,
        closureDate: issue.closureDate || null,
        evaluationStructure,
        isPairwise,
        admin: issue.admin
          ? {
              id: asId(issue.admin._id),
              name: issue.admin.name,
              email: issue.admin.email,
              role: issue.admin.role || "user",
              accountConfirm: Boolean(issue.admin.accountConfirm),
            }
          : null,
        model: issue.model
          ? {
              id: asId(issue.model._id),
              name: issue.model.name,
              evaluationStructure: modelEvaluationStructure,
              isPairwise:
                modelEvaluationStructure ===
                EVALUATION_STRUCTURES.PAIRWISE_ALTERNATIVES,
              isConsensus: Boolean(issue.model.isConsensus),
              isMultiCriteria: Boolean(issue.model.isMultiCriteria),
            }
          : null,
        metrics: {
          totalAlternatives,
          totalLeafCriteria,
          totalExperts: participationStats.totalExperts || 0,
          acceptedExperts: participationStats.acceptedExperts || 0,
          pendingExperts: participationStats.pendingExperts || 0,
          declinedExperts: participationStats.declinedExperts || 0,
          weightsDoneAccepted: participationStats.weightsDoneAccepted || 0,
          evaluationsDoneAccepted:
            participationStats.evaluationsDoneAccepted || 0,
          consensusRounds: consensusStats.totalRounds || 0,
          latestConsensusPhase: consensusStats.latestPhase || 0,
          latestConsensusAt: consensusStats.latestTimestamp || null,
          scenarios: scenariosMap.get(issueId) || 0,
          expectedEvaluationCellsPerExpert: expectedPerExpert,
          totalFilledEvaluationCells: evaluationStats.filledCells || 0,
          lastEvaluationAt: evaluationStats.lastEvaluationAt || null,
        },
        creatorActionsState: getCreatorActionFlags({
          issue,
          acceptedExperts: participationStats.acceptedExperts || 0,
          pendingExperts: participationStats.pendingExperts || 0,
          weightsDoneAccepted: participationStats.weightsDoneAccepted || 0,
          evaluationsDoneAccepted:
            participationStats.evaluationsDoneAccepted || 0,
        }),
      };
    }),
  };
};