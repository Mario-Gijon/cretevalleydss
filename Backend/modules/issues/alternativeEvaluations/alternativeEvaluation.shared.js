import { Alternative } from "../../../models/Alternatives.js";
import { Consensus } from "../../../models/Consensus.js";
import { Criterion } from "../../../models/Criteria.js";
import { IssueExpressionDomain } from "../../../models/IssueExpressionDomains.js";
import { Issue } from "../../../models/Issues.js";
import { Participation } from "../../../models/Participations.js";
import {
  createBadRequestError,
  createForbiddenError,
  createNotFoundError,
} from "../../../utils/common/errors.js";
import { toIdString } from "../../../utils/common/ids.js";

import {
  getAcceptedParticipation,
  getDefaultIssueSnapshot,
  getNextConsensusPhase,
} from "../issue.queries.js";
import { resolveEvaluationStructure } from "../issue.evaluationStructure.js";

/**
 * Construye un mapa nombre -> id a partir de una colección de documentos.
 *
 * @param {Array<Object>} docs Documentos con campos name y _id.
 * @returns {Map<string, string>}
 */
const buildNameIdMap = (docs = []) =>
  new Map(
    docs.map((doc) => [doc.name, toIdString(doc._id)]).filter(([, id]) =>
      Boolean(id)
    )
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
 * @param {Object|null} [params.issue=null] Issue precargado para evitar recarga por id.
 * @returns {Promise<Object>}
 */
export const getEvaluationSaveContext = async ({
  issueId,
  userId,
  expectedStructure,
  invalidStructureMessage,
  requireDefaultSnapshot = false,
  issue = null,
}) => {
  const issueDoc = issue || (await Issue.findById(issueId).lean());

  if (!issueDoc) {
    throw createNotFoundError("Issue not found", {
      field: "issueId",
    });
  }

  const evaluationStructure = resolveEvaluationStructure(issueDoc);
  if (evaluationStructure !== expectedStructure) {
    throw createBadRequestError(invalidStructureMessage);
  }

  const [participation, alternatives, criteria, currentPhase, defaultSnapshot] =
    await Promise.all([
      getAcceptedParticipation(issueDoc._id, userId),
      Alternative.find({ issue: issueDoc._id }).sort({ name: 1 }).lean(),
      Criterion.find({ issue: issueDoc._id }).select("_id name").lean(),
      getNextConsensusPhase(issueDoc._id),
      requireDefaultSnapshot
        ? getDefaultIssueSnapshot(issueDoc._id)
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
    issue: issueDoc,
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
 * Carga y valida el contexto base necesario para leer evaluaciones.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string} params.issueId Id del issue.
 * @param {string} params.userId Id del usuario actual.
 * @param {string} params.expectedStructure Estructura esperada del issue.
 * @param {string} params.invalidStructureMessage Mensaje si la estructura no coincide.
 * @param {Object|null} [params.issue=null] Issue precargado para evitar recarga por id.
 * @returns {Promise<Object>}
 */
export const getEvaluationReadContext = async ({
  issueId,
  userId,
  expectedStructure,
  invalidStructureMessage,
  issue = null,
}) => {
  const issueDoc = issue || (await Issue.findById(issueId).lean());

  if (!issueDoc) {
    throw createNotFoundError("Issue not found", {
      field: "issueId",
    });
  }

  const evaluationStructure = resolveEvaluationStructure(issueDoc);
  if (evaluationStructure !== expectedStructure) {
    throw createBadRequestError(invalidStructureMessage);
  }

  const [participation, latestConsensus] = await Promise.all([
    getAcceptedParticipation(issueDoc._id, userId),
    Consensus.findOne({ issue: issueDoc._id }).sort({ phase: -1 }).lean(),
  ]);

  if (!participation) {
    throw createForbiddenError("You are no longer a participant in this issue");
  }

  return {
    issue: issueDoc,
    latestConsensus,
  };
};

/**
 * Marca la participación del experto como evaluación completada.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string} params.issueId Id del issue.
 * @param {string} params.userId Id del experto.
 * @returns {Promise<void>}
 */
export const markParticipationEvaluationCompletedOrThrow = async ({
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
