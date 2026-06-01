import { ExitUserIssue } from "../../../models/ExitUserIssue.js";
import { Issue } from "../../../models/Issues.js";
import { Participation } from "../../../models/Participations.js";
import {
  createBadRequestError,
  createInternalError,
  createNotFoundError,
} from "../../../utils/common/errors.js";
import { toIdString, uniqueIdStrings } from "../../../utils/common/ids.js";
import { isValidObjectIdLike } from "../../../utils/common/mongoose.js";

const validateIssueIdOrThrow = (issueId) => {
  if (!issueId || !isValidObjectIdLike(issueId)) {
    throw createBadRequestError("Valid issue id is required", {
      field: "issueId",
    });
  }
};

export const getIssueByIdOrThrow = async (issueId, options = {}) => {
  validateIssueIdOrThrow(issueId);

  const { select, populate = null, lean = true, session = null } = options;

  let query = Issue.findById(issueId);

  if (select) {
    query = query.select(select);
  }

  if (populate) {
    query = query.populate(populate);
  }

  if (session) {
    query = query.session(session);
  }

  const issue = lean ? await query.lean() : await query;

  if (!issue) {
    throw createNotFoundError("Issue not found", {
      field: "issueId",
    });
  }

  return issue;
};

export const getNextConsensusPhase = async (issueId) => {
  const issue = await Issue.findById(issueId).select("consensusPhase").lean();
  if (!issue) {
    throw createNotFoundError("Issue not found", {
      field: "issueId",
    });
  }

  const phase = issue.consensusPhase;

  if (!Number.isInteger(phase) || phase < 1) {
    throw createInternalError("Issue consensusPhase is invalid", {
      field: "consensusPhase",
      details: {
        issueId,
        consensusPhase: issue.consensusPhase,
      },
    });
  }

  return phase;
};

export const getAcceptedParticipation = async (issueId, userId) =>
  Participation.findOne({
    issue: issueId,
    expert: userId,
    invitationStatus: "accepted",
  });

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

export const getVisibleActiveIssueIdsForUser = async (userId) => {
  const normalizedUserId = toIdString(userId);

  if (!normalizedUserId) {
    throw createBadRequestError("Valid user id is required", {
      field: "userId",
    });
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
    adminIssues.map((issue) => toIdString(issue._id))
  );

  const expertIssueIds = uniqueIdStrings(
    acceptedParticipations
      .filter((participation) => participation.issue)
      .map((participation) => toIdString(participation.issue._id))
  );

  return {
    issueIds: uniqueIdStrings([...adminIssueIds, ...expertIssueIds]),
    adminIssueIds,
  };
};

export const getUserFinishedIssueIds = async (
  userId,
  { excludeHidden = true, session = null } = {}
) => {
  const normalizedUserId = toIdString(userId);

  if (!normalizedUserId) {
    throw createBadRequestError("Valid user id is required", {
      field: "userId",
    });
  }

  const adminIssues = await Issue.find({
    admin: normalizedUserId,
    active: false,
  })
    .select("_id")
    .session(session)
    .lean();

  const adminIssueIds = uniqueIdStrings(
    adminIssues.map((issue) => toIdString(issue._id))
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
      .map((participation) => toIdString(participation.issue._id))
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

  const hiddenIdsAsString = new Set(hiddenIssueIds.map((id) => toIdString(id)));

  return allIssueIds.filter((id) => !hiddenIdsAsString.has(id));
};
