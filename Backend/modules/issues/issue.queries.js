         
import { ExitUserIssue } from "../../models/ExitUserIssue.js";
import { IssueExpressionDomain } from "../../models/IssueExpressionDomains.js";
import { Issue } from "../../models/Issues.js";
import { Participation } from "../../models/Participations.js";

          
import {
  ensureIssueOrdersDb,
  getOrderedLeafCriteriaDb,
} from "./issue.ordering.js";

        
import {
  createBadRequestError,
  createNotFoundError,
} from "../../utils/common/errors.js";
import { toIdString, uniqueIdStrings } from "../../utils/common/ids.js";
import { isValidObjectIdLike } from "../../utils/common/mongoose.js";

/**
 * Valida que el id de issue sea válido.
 *
 * @param {string} issueId Id del issue.
 * @returns {void}
 */
export const validateIssueIdOrThrow = (issueId) => {
  if (!issueId || !isValidObjectIdLike(issueId)) {
    throw createBadRequestError("Valid issue id is required", {
      field: "issueId",
    });
  }
};

/**
 * Carga un issue por id y lanza error si no existe.
 *
 * @param {string} issueId Id del issue.
 * @param {object} [options={}] Opciones de carga.
 * @param {string} [options.select] Proyección mongoose.
 * @returns {Promise<Object>}
 */
export const getIssueByIdOrThrow = async (issueId, options = {}) => {
  validateIssueIdOrThrow(issueId);

  const { select, lean = true } = options;

  let query = Issue.findById(issueId);

  if (select) {
    query = query.select(select);
  }

  const issue = lean ? await query.lean() : await query;

  if (!issue) {
    throw createNotFoundError("Issue not found", {
      field: "issueId",
    });
  }

  return issue;
};

/**
 * @typedef {Object} WeightCompletionStats
 * @property {number} totalParticipants
 * @property {number} totalWeightsDone
 */

/**
 * @typedef {Object} VisibleActiveIssueIds
 * @property {string[]} issueIds
 * @property {string[]} adminIssueIds
 */

/**
 * @typedef {Object} FinishedIssueIdsOptions
 * @property {boolean} [excludeHidden]
 * @property {Object|null} [session]
 */

/**
 * Obtiene la siguiente fase de consenso para un issue.
 *
 * @param {string|Object} issueId Id del issue.
 * @returns {Promise<number>}
 */
export const getNextConsensusPhase = async (issueId) => {
  const issue = await Issue.findById(issueId).select("consensusPhase").lean();
  const phase = Number(issue?.consensusPhase);

  if (!Number.isInteger(phase) || phase < 1) {
    throw createBadRequestError("Issue consensusPhase is invalid", {
      field: "consensusPhase",
      details: {
        consensusPhase: issue?.consensusPhase ?? null,
      },
    });
  }

  return phase;
};

/**
 * Obtiene el snapshot por defecto de un issue, priorizando dominios numéricos.
 *
 * @param {string|Object} issueId Id del issue.
 * @returns {Promise<Object|null>}
 */
export const getDefaultIssueSnapshot = async (issueId) => {
  const numericSnapshot = await IssueExpressionDomain.findOne({
    issue: issueId,
    type: "numeric",
  })
    .sort({ createdAt: 1 })
    .lean();

  if (numericSnapshot) {
    return numericSnapshot;
  }

  return IssueExpressionDomain.findOne({ issue: issueId })
    .sort({ createdAt: 1 })
    .lean();
};

/**
 * Obtiene la participación aceptada del usuario en un issue.
 *
 * @param {string|Object} issueId Id del issue.
 * @param {string|Object} userId Id del usuario.
 * @returns {Promise<Object|null>}
 */
export const getAcceptedParticipation = async (issueId, userId) =>
  Participation.findOne({
    issue: issueId,
    expert: userId,
    invitationStatus: "accepted",
  });

/**
 * Obtiene los criterios hoja ordenados canónicamente para un issue.
 *
 * Este helper se mantiene aquí porque se usa como query de conveniencia
 * desde la capa HTTP, pero la lógica de orden canónico vive en issue.ordering.js.
 *
 * @param {Object} issue Documento del issue.
 * @returns {Promise<Array<Object>>}
 */
export const getOrderedLeafCriteriaForIssue = async (issue) => {
  await ensureIssueOrdersDb({ issueId: issue._id });

  return getOrderedLeafCriteriaDb({
    issueId: issue._id,
    select: "_id name",
    lean: true,
  });
};

/**
 * Obtiene estadísticas de pesos completados para un issue.
 *
 * @param {string|Object} issueId Id del issue.
 * @returns {Promise<WeightCompletionStats>}
 */
export const getWeightCompletionStats = async (issueId) => {
  const [totalParticipants, totalWeightsDone] = await Promise.all([
    Participation.countDocuments({
      issue: issueId,
      invitationStatus: { $in: ["accepted", "pending"] },
    }),
    Participation.countDocuments({
      issue: issueId,
      invitationStatus: { $in: ["accepted", "pending"] },
      weightsCompleted: true,
    }),
  ]);

  return { totalParticipants, totalWeightsDone };
};

/**
 * Obtiene los ids de issues activos visibles para un usuario.
 *
 * Incluye issues donde el usuario es admin y issues donde participa
 * como experto con invitación aceptada.
 *
 * @param {string|Object} userId Id del usuario.
 * @returns {Promise<VisibleActiveIssueIds>}
 */
export const getVisibleActiveIssueIdsForUser = async (userId) => {
  const normalizedUserId = toIdString(userId);

  if (!normalizedUserId) {
    return {
      issueIds: [],
      adminIssueIds: [],
    };
  }

  const [adminIssues, acceptedParticipations] = await Promise.all([
    Issue.find({ admin: normalizedUserId, active: true }).select("_id").lean(),
    Participation.find({
      expert: normalizedUserId,
      invitationStatus: "accepted",
    })
      .populate({
        path: "issue",
        match: { active: true },
        select: "_id",
      })
      .lean(),
  ]);

  const adminIssueIds = uniqueIdStrings(
    adminIssues.map((issue) => toIdString(issue._id)).filter(Boolean)
  );

  const expertIssueIds = uniqueIdStrings(
    acceptedParticipations
      .filter((participation) => participation.issue)
      .map((participation) => toIdString(participation.issue?._id))
      .filter(Boolean)
  );

  return {
    issueIds: uniqueIdStrings([...adminIssueIds, ...expertIssueIds]),
    adminIssueIds,
  };
};

/**
 * Obtiene los ids de issues finalizados visibles para un usuario.
 *
 * @param {string|Object} userId Id del usuario.
 * @param {FinishedIssueIdsOptions} [options]
 * @returns {Promise<string[]>}
 */
export const getUserFinishedIssueIds = async (
  userId,
  { excludeHidden = true, session = null } = {}
) => {
  const normalizedUserId = toIdString(userId);

  if (!normalizedUserId) {
    return [];
  }

  const adminIssues = await Issue.find({
    admin: normalizedUserId,
    active: false,
  })
    .select("_id")
    .session(session)
    .lean();

  const adminIssueIds = uniqueIdStrings(
    adminIssues.map((issue) => toIdString(issue._id)).filter(Boolean)
  );

  const participations = await Participation.find({
    expert: normalizedUserId,
    invitationStatus: "accepted",
  })
    .populate({
      path: "issue",
      match: { active: false },
      select: "_id",
    })
    .session(session)
    .lean();

  const expertIssueIds = uniqueIdStrings(
    participations
      .filter((participation) => participation.issue)
      .map((participation) => toIdString(participation.issue?._id))
      .filter(Boolean)
  );

  const allIssueIds = uniqueIdStrings([...adminIssueIds, ...expertIssueIds]);

  if (!excludeHidden || allIssueIds.length === 0) {
    return allIssueIds;
  }

  const hiddenIssueIds = await ExitUserIssue.find({
    user: normalizedUserId,
    issue: { $in: allIssueIds },
    hidden: true,
  })
    .session(session)
    .distinct("issue");

  const hiddenIdsAsString = new Set(
    hiddenIssueIds.map((id) => toIdString(id)).filter(Boolean)
  );

  return allIssueIds.filter((id) => !hiddenIdsAsString.has(id));
};
