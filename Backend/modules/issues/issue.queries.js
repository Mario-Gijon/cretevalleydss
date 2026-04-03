// Models
import { Consensus } from "../../models/Consensus.js";
import { ExitUserIssue } from "../../models/ExitUserIssue.js";
import { IssueExpressionDomain } from "../../models/IssueExpressionDomains.js";
import { Issue } from "../../models/Issues.js";
import { Participation } from "../../models/Participations.js";

// Modules
import {
  ensureIssueOrdersDb,
  getOrderedLeafCriteriaDb,
} from "./issue.ordering.js";

// Utils
import { toIdString, uniqueIdStrings } from "../../utils/common/ids.js";

/**
 * Obtiene la siguiente fase de consenso para un issue.
 *
 * @param {import("mongoose").Types.ObjectId | string} issueId Id del issue.
 * @returns {Promise<number>}
 */
export const getNextConsensusPhase = async (issueId) => {
  const latestConsensus = await Consensus.findOne({ issue: issueId })
    .sort({ phase: -1 })
    .lean();

  return latestConsensus ? latestConsensus.phase + 1 : 1;
};

/**
 * Obtiene el snapshot por defecto de un issue, priorizando dominios numéricos.
 *
 * @param {import("mongoose").Types.ObjectId | string} issueId Id del issue.
 * @returns {Promise<Record<string, any> | null>}
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
 * @param {import("mongoose").Types.ObjectId | string} issueId Id del issue.
 * @param {import("mongoose").Types.ObjectId | string} userId Id del usuario.
 * @returns {Promise<Record<string, any> | null>}
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
 * @param {Record<string, any>} issue Documento del issue.
 * @returns {Promise<Array<Record<string, any>>>}
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
 * @param {import("mongoose").Types.ObjectId | string} issueId Id del issue.
 * @returns {Promise<{ totalParticipants: number, totalWeightsDone: number }>}
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
 * @param {import("mongoose").Types.ObjectId | string} userId Id del usuario.
 * @returns {Promise<{ issueIds: string[], adminIssueIds: string[] }>}
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
 * @param {import("mongoose").Types.ObjectId | string} userId Id del usuario.
 * @param {{ excludeHidden?: boolean, session?: import("mongoose").ClientSession | null }} [options]
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