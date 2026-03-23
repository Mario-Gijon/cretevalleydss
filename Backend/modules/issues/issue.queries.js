// Models
import { Consensus } from "../../models/Consensus.js";
import { IssueExpressionDomain } from "../../models/IssueExpressionDomains.js";
import { Participation } from "../../models/Participations.js";

// Utils
import {
  ensureIssueOrdersDb,
  getOrderedLeafCriteriaDb,
} from "../../utils/issueOrdering.js";

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
 * @param {Record<string, any>} issue Documento del issue.
 * @returns {Promise<Array<Record<string, any>>>}
 */
export const getOrderedLeafCriteriaForIssue = async (issue) => {
  await ensureIssueOrdersDb({ issueId: issue._id });

  return getOrderedLeafCriteriaDb({
    issueId: issue._id,
    issueDoc: issue,
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