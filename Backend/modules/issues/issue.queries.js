// Models
import { Consensus } from "../../models/Consensus.js";
import { IssueExpressionDomain } from "../../models/IssueExpressionDomains.js";
import { Participation } from "../../models/Participations.js";
import { Issue } from "../../models/Issues.js";
import { toIdString, uniqueIdStrings } from "../../utils/common/ids.js";
import { Criterion } from "../../models/Criteria.js";
import { orderDocsByIdList } from "./issue.ordering.js";
import { ExitUserIssue } from "../../models/ExitUserIssue.js";


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
 * @param {string|Object} userId Id del usuario.
 * @param {{ excludeHidden?: boolean, session?: import("mongoose").ClientSession|null }} [options]
 * @returns {Promise<Array<string>>}
 */
export const getUserFinishedIssueIds = async (
  userId,
  { excludeHidden = true, session = null } = {}
) => {
  const adminIssues = await Issue.find({ admin: userId, active: false })
    .session(session)
    .lean();

  const adminIssueIds = adminIssues.map((issue) => issue._id.toString());

  const participations = await Participation.find({
    expert: userId,
    invitationStatus: "accepted",
  })
    .populate({
      path: "issue",
      match: { active: false },
    })
    .session(session)
    .lean();

  const expertIssueIds = participations
    .filter((participation) => participation.issue)
    .map((participation) => participation.issue._id.toString());

  const allIssueIds = [...new Set([...adminIssueIds, ...expertIssueIds])];

  if (!excludeHidden) {
    return allIssueIds;
  }

  const hiddenIssueIds = await ExitUserIssue.find({
    user: userId,
    issue: { $in: allIssueIds },
    hidden: true,
  })
    .session(session)
    .distinct("issue");

  const hiddenIdsAsString = hiddenIssueIds.map((id) => id.toString());

  return allIssueIds.filter((id) => !hiddenIdsAsString.includes(id));
};

/**
 * Genera y guarda los órdenes del issue si no existen.
 *
 * @param {{ issueId?: string|Object, session?: import("mongoose").ClientSession|null }} [params]
 * @returns {Promise<Object|null>}
 */
export const ensureIssueOrdersDb = async ({ issueId, session } = {}) => {
  const issue = await Issue.findById(issueId)
    .select("_id alternativeOrder leafCriteriaOrder")
    .session(session || null);

  if (!issue) return null;

  const needsAlternativeOrder =
    !Array.isArray(issue.alternativeOrder) || issue.alternativeOrder.length === 0;

  const needsLeafCriteriaOrder =
    !Array.isArray(issue.leafCriteriaOrder) || issue.leafCriteriaOrder.length === 0;

  if (!needsAlternativeOrder && !needsLeafCriteriaOrder) {
    return issue;
  }

  const [alternatives, leafCriteria] = await Promise.all([
    Alternative.find({ issue: issue._id }).select("_id name").session(session || null).lean(),
    Criterion.find({ issue: issue._id, isLeaf: true })
      .select("_id name")
      .session(session || null)
      .lean(),
  ]);

  if (needsAlternativeOrder) {
    issue.alternativeOrder = sortDocsByNameId(alternatives).map((doc) => doc._id);
  }

  if (needsLeafCriteriaOrder) {
    issue.leafCriteriaOrder = sortDocsByNameId(leafCriteria).map((doc) => doc._id);
  }

  await issue.save({ session });

  return issue;
};

/**
 * Obtiene las alternativas ordenadas de un issue.
 *
 * @param {Object} [params]
 * @returns {Promise<Array<Object>>}
 */
export const getOrderedAlternativesDb = async ({
  issueId,
  issueDoc = null,
  session = null,
  select = "_id name",
  lean = true,
} = {}) => {
  const issue =
    issueDoc ||
    (await Issue.findById(issueId)
      .select("_id alternativeOrder")
      .session(session || null)
      .lean());

  if (!issue) return [];

  const query = Alternative.find({ issue: issue._id }).select(select).session(session || null);
  const alternatives = lean ? await query.lean() : await query;

  return orderDocsByIdList(alternatives, issue.alternativeOrder);
};

/**
 * Obtiene los criterios hoja ordenados de un issue.
 *
 * @param {Object} [params]
 * @returns {Promise<Array<Object>>}
 */
export const getOrderedLeafCriteriaDb = async ({
  issueId,
  issueDoc = null,
  session = null,
  select = "_id name type isLeaf parentCriterion",
  lean = true,
} = {}) => {
  const issue =
    issueDoc ||
    (await Issue.findById(issueId)
      .select("_id leafCriteriaOrder")
      .session(session || null)
      .lean());

  if (!issue) return [];

  const query = Criterion.find({ issue: issue._id, isLeaf: true })
    .select(select)
    .session(session || null);

  const leafCriteria = lean ? await query.lean() : await query;

  return orderDocsByIdList(leafCriteria, issue.leafCriteriaOrder);
};