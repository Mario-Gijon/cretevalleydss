// Models
import { Alternative } from "../../models/Alternatives.js";
import { Consensus } from "../../models/Consensus.js";
import { Criterion } from "../../models/Criteria.js";
import { Evaluation } from "../../models/Evaluations.js";
import { IssueExpressionDomain } from "../../models/IssueExpressionDomains.js";
import { Issue } from "../../models/Issues.js";
import { Participation } from "../../models/Participations.js";

// Modules
import {
  getAcceptedParticipation,
  getDefaultIssueSnapshot,
  getNextConsensusPhase,
} from "./issue.queries.js";

import {
  EVALUATION_STRUCTURES,
  resolveEvaluationStructure,
} from "./issue.evaluationStructure.js";

import {
  formatExpressionDomainForClient,
  formatPairwiseEvaluationsByCriterion,
} from "./issue.mappers.js";

// Utils
import {
  createBadRequestError,
  createForbiddenError,
  createNotFoundError,
} from "../../utils/common/errors.js";
import { toIdString } from "../../utils/common/ids.js";
import {
  validateFinalEvaluations,
  validateFinalPairwiseEvaluations,
} from "./issue.validation.js";

/**
 * Construye un mapa nombre -> id a partir de una colección de documentos.
 *
 * @param {Array<Object>} docs Documentos con campos name y _id.
 * @returns {Map<string, string>}
 */
const buildNameIdMap = (docs = []) =>
  new Map(
    docs.map((doc) => [doc.name, toIdString(doc._id)]).filter(([, id]) => Boolean(id))
  );

/**
 * Carga y valida el contexto base necesario para guardar evaluaciones.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string} params.issueId Id del issue.
 * @param {string} params.userId Id del usuario actual.
 * @param {string} params.expectedStructure Estructura esperada del issue.
 * @param {string} params.invalidStructureMessage Mensaje de error si la estructura no coincide.
 * @param {boolean} [params.requireDefaultSnapshot=false] Indica si debe existir un snapshot por defecto.
 * @returns {Promise<Object>}
 */
export const getEvaluationSaveContext = async ({
  issueId,
  userId,
  expectedStructure,
  invalidStructureMessage,
  requireDefaultSnapshot = false,
}) => {
  const issue = await Issue.findById(issueId).lean();

  if (!issue) {
    throw createNotFoundError("Issue not found");
  }

  const evaluationStructure = resolveEvaluationStructure(issue);
  if (evaluationStructure !== expectedStructure) {
    throw createBadRequestError(invalidStructureMessage);
  }

  const [participation, alternatives, criteria, currentPhase, defaultSnapshot] =
    await Promise.all([
      getAcceptedParticipation(issue._id, userId),
      Alternative.find({ issue: issue._id }).sort({ name: 1 }).lean(),
      Criterion.find({ issue: issue._id }).select("_id name").lean(),
      getNextConsensusPhase(issue._id),
      requireDefaultSnapshot
        ? getDefaultIssueSnapshot(issue._id)
        : Promise.resolve(null),
    ]);

  if (!participation) {
    throw createForbiddenError("You are no longer a participant in this issue");
  }

  if (requireDefaultSnapshot && !defaultSnapshot) {
    throw createBadRequestError(
      "This issue has no IssueExpressionDomain snapshots."
    );
  }

  return {
    issue,
    currentPhase,
    defaultSnapshot,
    alternativeMap: buildNameIdMap(alternatives),
    criterionMap: buildNameIdMap(criteria),
  };
};

/**
 * Verifica que todos los snapshots indicados pertenezcan al issue.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string} params.issueId Id del issue.
 * @param {string[]} params.snapshotIds Ids de snapshots a validar.
 * @returns {Promise<void>}
 */
export const ensureIssueSnapshotIdsExist = async ({
  issueId,
  snapshotIds,
}) => {
  if (!Array.isArray(snapshotIds) || snapshotIds.length === 0) {
    return;
  }

  const normalizedSnapshotIds = snapshotIds.map(toIdString).filter(Boolean);

  if (normalizedSnapshotIds.length === 0) {
    return;
  }

  const count = await IssueExpressionDomain.countDocuments({
    _id: { $in: normalizedSnapshotIds },
    issue: issueId,
  });

  if (count !== normalizedSnapshotIds.length) {
    throw createBadRequestError(
      "Invalid expressionDomain snapshot for this issue"
    );
  }
};

/**
 * Construye las operaciones bulk para guardar evaluaciones directas.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string} params.userId Id del experto actual.
 * @param {string} params.issueId Id del issue.
 * @param {number} params.currentPhase Fase de consenso actual.
 * @param {Object} params.evaluations Evaluaciones directas recibidas.
 * @param {Map<string, string>} params.alternativeMap Mapa de alternativas por nombre.
 * @param {Map<string, string>} params.criterionMap Mapa de criterios por nombre.
 * @returns {Object}
 */
export const buildDirectEvaluationBulkOperations = ({
  userId,
  issueId,
  currentPhase,
  evaluations,
  alternativeMap,
  criterionMap,
}) => {
  const bulkOperations = [];
  const snapshotIds = new Set();

  for (const [alternativeName, criterionEvaluations] of Object.entries(
    evaluations || {}
  )) {
    const alternativeId = alternativeMap.get(alternativeName);
    if (!alternativeId) continue;

    for (const [criterionName, evaluationData] of Object.entries(
      criterionEvaluations || {}
    )) {
      const criterionId = criterionMap.get(criterionName);
      if (!criterionId) continue;

      const { value, domain } = evaluationData || {};
      const snapshotId = toIdString(domain?.id) || null;

      if (snapshotId) {
        snapshotIds.add(snapshotId);
      }

      bulkOperations.push({
        updateOne: {
          filter: {
            expert: userId,
            issue: issueId,
            alternative: alternativeId,
            criterion: criterionId,
            comparedAlternative: null,
          },
          update: {
            $set: {
              value,
              expressionDomain: snapshotId,
              timestamp: new Date(),
              consensusPhase: currentPhase,
            },
          },
          upsert: true,
        },
      });
    }
  }

  return {
    bulkOperations,
    snapshotIds: Array.from(snapshotIds),
  };
};

/**
 * Construye las operaciones bulk para guardar evaluaciones pairwise.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string} params.userId Id del experto actual.
 * @param {string} params.issueId Id del issue.
 * @param {number} params.currentPhase Fase de consenso actual.
 * @param {Object} params.evaluations Evaluaciones pairwise recibidas.
 * @param {Map<string, string>} params.alternativeMap Mapa de alternativas por nombre.
 * @param {Map<string, string>} params.criterionMap Mapa de criterios por nombre.
 * @param {string} params.defaultSnapshotId Snapshot por defecto del issue.
 * @returns {Object}
 */
export const buildPairwiseEvaluationBulkOperations = ({
  userId,
  issueId,
  currentPhase,
  evaluations,
  alternativeMap,
  criterionMap,
  defaultSnapshotId,
}) => {
  const bulkOperations = [];
  const snapshotIds = new Set();

  for (const [criterionName, evaluationsByAlternative] of Object.entries(
    evaluations || {}
  )) {
    const criterionId = criterionMap.get(criterionName);
    if (!criterionId) continue;

    for (const evaluationData of evaluationsByAlternative || []) {
      const { id: alternativeName, ...rest } = evaluationData || {};
      const alternativeId = alternativeMap.get(alternativeName);
      if (!alternativeId) continue;

      const snapshotId =
        toIdString(rest?.expressionDomain?.id) ||
        toIdString(rest?.domain?.id) ||
        defaultSnapshotId;

      if (snapshotId) {
        snapshotIds.add(snapshotId);
      }

      const comparisons = { ...rest };
      delete comparisons.expressionDomain;
      delete comparisons.domain;

      for (const [comparedAlternativeName, valueOrObj] of Object.entries(
        comparisons
      )) {
        if (comparedAlternativeName === alternativeName) continue;

        const comparedAlternativeId =
          alternativeMap.get(comparedAlternativeName);
        if (!comparedAlternativeId) continue;

        const value =
          valueOrObj &&
          typeof valueOrObj === "object" &&
          "value" in valueOrObj
            ? valueOrObj.value
            : valueOrObj;

        bulkOperations.push({
          updateOne: {
            filter: {
              expert: userId,
              issue: issueId,
              alternative: alternativeId,
              comparedAlternative: comparedAlternativeId,
              criterion: criterionId,
            },
            update: {
              $set: {
                value,
                expressionDomain: snapshotId,
                timestamp: new Date(),
                consensusPhase: currentPhase,
              },
            },
            upsert: true,
          },
        });
      }
    }
  }

  return {
    bulkOperations,
    snapshotIds: Array.from(snapshotIds),
  };
};

/**
 * Guarda borradores de evaluaciones directas.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string} params.issueId Id del issue.
 * @param {string} params.userId Id del usuario actual.
 * @param {Object} params.evaluations Evaluaciones directas recibidas.
 * @returns {Promise<Object>}
 */
export const saveDirectEvaluationDrafts = async ({
  issueId,
  userId,
  evaluations,
}) => {
  const { issue, currentPhase, alternativeMap, criterionMap } =
    await getEvaluationSaveContext({
      issueId,
      userId,
      expectedStructure: EVALUATION_STRUCTURES.DIRECT,
      invalidStructureMessage:
        "This issue uses pairwise alternative evaluation",
    });

  const { bulkOperations, snapshotIds } = buildDirectEvaluationBulkOperations({
    userId,
    issueId: toIdString(issue._id),
    currentPhase,
    evaluations,
    alternativeMap,
    criterionMap,
  });

  await ensureIssueSnapshotIdsExist({
    issueId: toIdString(issue._id),
    snapshotIds,
  });

  if (bulkOperations.length > 0) {
    await Evaluation.bulkWrite(bulkOperations);
  }

  return { updatedCount: bulkOperations.length };
};

/**
 * Guarda borradores de evaluaciones pairwise.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string} params.issueId Id del issue.
 * @param {string} params.userId Id del usuario actual.
 * @param {Object} params.evaluations Evaluaciones pairwise recibidas.
 * @returns {Promise<Object>}
 */
export const savePairwiseEvaluationDrafts = async ({
  issueId,
  userId,
  evaluations,
}) => {
  const {
    issue,
    currentPhase,
    defaultSnapshot,
    alternativeMap,
    criterionMap,
  } = await getEvaluationSaveContext({
    issueId,
    userId,
    expectedStructure: EVALUATION_STRUCTURES.PAIRWISE_ALTERNATIVES,
    invalidStructureMessage:
      "This issue does not use pairwise alternative evaluation",
    requireDefaultSnapshot: true,
  });

  const defaultSnapshotId = toIdString(defaultSnapshot?._id);
  if (!defaultSnapshotId) {
    throw createBadRequestError(
      "This issue has no IssueExpressionDomain snapshots."
    );
  }

  const { bulkOperations, snapshotIds } =
    buildPairwiseEvaluationBulkOperations({
      userId,
      issueId: toIdString(issue._id),
      currentPhase,
      evaluations,
      alternativeMap,
      criterionMap,
      defaultSnapshotId,
    });

  await ensureIssueSnapshotIdsExist({
    issueId: toIdString(issue._id),
    snapshotIds,
  });

  if (bulkOperations.length > 0) {
    await Evaluation.bulkWrite(bulkOperations);
  }

  return { updatedCount: bulkOperations.length };
};

/**
 * Construye un error de validación para evaluaciones directas.
 *
 * @param {Object} validation Resultado de validación.
 * @returns {Error}
 */
const buildDirectEvaluationValidationError = (validation) => {
  const error = createBadRequestError(
    validation?.error?.message || "Invalid direct evaluations"
  );

  if (validation?.error?.alternative) {
    error.alternative = validation.error.alternative;
  }

  if (validation?.error?.criterion) {
    error.criterion = validation.error.criterion;
  }

  return error;
};

/**
 * Construye un error de validación para evaluaciones pairwise.
 *
 * @param {Object} validation Resultado de validación.
 * @returns {Error}
 */
const buildPairwiseEvaluationValidationError = (validation) => {
  const error = createBadRequestError(
    validation?.error?.message || "Invalid pairwise evaluations"
  );

  if (validation?.error?.criterion) {
    error.criterion = validation.error.criterion;
  }

  if (validation?.error?.row) {
    error.row = validation.error.row;
  }

  if (validation?.error?.col) {
    error.col = validation.error.col;
  }

  return error;
};

/**
 * Marca la participación del experto como evaluación completada.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string} params.issueId Id del issue.
 * @param {string} params.userId Id del experto.
 * @returns {Promise<void>}
 */
const markParticipationEvaluationCompletedOrThrow = async ({
  issueId,
  userId,
}) => {
  const participation = await Participation.findOneAndUpdate(
    {
      issue: issueId,
      expert: userId,
      invitationStatus: "accepted",
    },
    { $set: { evaluationCompleted: true } },
    { new: true }
  );

  if (!participation) {
    throw createNotFoundError("Participation not found");
  }
};

/**
 * Valida y envía las evaluaciones directas del experto actual.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string} params.issueId Id del issue.
 * @param {string} params.userId Id del usuario actual.
 * @param {Object} params.evaluations Evaluaciones directas recibidas.
 * @returns {Promise<Object>}
 */
export const submitDirectEvaluationFlow = async ({
  issueId,
  userId,
  evaluations,
}) => {
  const validation = validateFinalEvaluations(evaluations);

  if (!validation.valid) {
    throw buildDirectEvaluationValidationError(validation);
  }

  await saveDirectEvaluationDrafts({
    issueId,
    userId,
    evaluations,
  });

  await markParticipationEvaluationCompletedOrThrow({
    issueId,
    userId,
  });

  return {
    success: true,
    msg: "Evaluations submitted successfully",
  };
};

/**
 * Valida y envía las evaluaciones pairwise del experto actual.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string} params.issueId Id del issue.
 * @param {string} params.userId Id del usuario actual.
 * @param {Object} params.evaluations Evaluaciones pairwise recibidas.
 * @returns {Promise<Object>}
 */
export const submitPairwiseEvaluationFlow = async ({
  issueId,
  userId,
  evaluations,
}) => {
  const validation = validateFinalPairwiseEvaluations(evaluations);

  if (!validation.valid) {
    throw buildPairwiseEvaluationValidationError(validation);
  }

  await savePairwiseEvaluationDrafts({
    issueId,
    userId,
    evaluations,
  });

  await markParticipationEvaluationCompletedOrThrow({
    issueId,
    userId,
  });

  return {
    success: true,
    msg: "Evaluations submitted successfully",
  };
};

/**
 * Carga y valida el contexto base necesario para leer evaluaciones.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string} params.issueId Id del issue.
 * @param {string} params.userId Id del usuario actual.
 * @param {string} params.expectedStructure Estructura esperada del issue.
 * @param {string} params.invalidStructureMessage Mensaje si la estructura no coincide.
 * @returns {Promise<Object>}
 */
export const getEvaluationReadContext = async ({
  issueId,
  userId,
  expectedStructure,
  invalidStructureMessage,
}) => {
  const issue = await Issue.findById(issueId).lean();

  if (!issue) {
    throw createNotFoundError("Issue not found");
  }

  const evaluationStructure = resolveEvaluationStructure(issue);
  if (evaluationStructure !== expectedStructure) {
    throw createBadRequestError(invalidStructureMessage);
  }

  const [participation, latestConsensus] = await Promise.all([
    getAcceptedParticipation(issue._id, userId),
    Consensus.findOne({ issue: issue._id }).sort({ phase: -1 }).lean(),
  ]);

  if (!participation) {
    throw createForbiddenError("You are no longer a participant in this issue");
  }

  return {
    issue,
    latestConsensus,
  };
};

/**
 * Obtiene el payload de evaluaciones directas del experto actual.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string} params.issueId Id del issue.
 * @param {string} params.userId Id del usuario actual.
 * @returns {Promise<Object>}
 */
export const getDirectEvaluationPayload = async ({ issueId, userId }) => {
  const { issue, latestConsensus } = await getEvaluationReadContext({
    issueId,
    userId,
    expectedStructure: EVALUATION_STRUCTURES.DIRECT,
    invalidStructureMessage:
      "This issue uses pairwise alternative evaluation",
  });

  const [alternatives, criteria, evaluationDocs] = await Promise.all([
    Alternative.find({ issue: issue._id }).sort({ name: 1 }).lean(),
    Criterion.find({ issue: issue._id, isLeaf: true }).sort({ name: 1 }).lean(),
    Evaluation.find({
      issue: issue._id,
      expert: userId,
      comparedAlternative: null,
    })
      .populate("alternative")
      .populate("criterion")
      .populate("expressionDomain")
      .lean(),
  ]);

  const evaluationMap = new Map();

  for (const evaluation of evaluationDocs) {
    const alternativeId = toIdString(evaluation.alternative?._id);
    const criterionId = toIdString(evaluation.criterion?._id);

    if (!alternativeId || !criterionId) continue;

    evaluationMap.set(`${alternativeId}_${criterionId}`, evaluation);
  }

  const evaluationsByAlternative = {};

  for (const alternative of alternatives) {
    evaluationsByAlternative[alternative.name] = {};

    for (const criterion of criteria) {
      const key = `${toIdString(alternative._id)}_${toIdString(criterion._id)}`;
      const evaluation = evaluationMap.get(key);

      evaluationsByAlternative[alternative.name][criterion.name] = {
        value: evaluation?.value ?? "",
        domain: formatExpressionDomainForClient(evaluation?.expressionDomain),
      };
    }
  }

  return {
    evaluations: evaluationsByAlternative,
    collectiveEvaluations: latestConsensus?.collectiveEvaluations || null,
  };
};

/**
 * Obtiene el payload de evaluaciones pairwise del experto actual.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string} params.issueId Id del issue.
 * @param {string} params.userId Id del usuario actual.
 * @returns {Promise<Object>}
 */
export const getPairwiseEvaluationPayload = async ({ issueId, userId }) => {
  const { issue, latestConsensus } = await getEvaluationReadContext({
    issueId,
    userId,
    expectedStructure: EVALUATION_STRUCTURES.PAIRWISE_ALTERNATIVES,
    invalidStructureMessage:
      "This issue does not use pairwise alternative evaluation",
  });

  const evaluations = await Evaluation.find({
    issue: issue._id,
    expert: userId,
    value: { $ne: null },
  })
    .populate("alternative")
    .populate("comparedAlternative")
    .populate("criterion")
    .populate("expressionDomain")
    .lean();

  const formattedEvaluations = formatPairwiseEvaluationsByCriterion(evaluations);

  return {
    evaluations: formattedEvaluations,
    collectiveEvaluations: latestConsensus?.collectiveEvaluations || null,
  };
};