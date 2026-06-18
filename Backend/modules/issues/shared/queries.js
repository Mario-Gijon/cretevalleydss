import { ExitUserIssue } from "../../../models/ExitUserIssue.js";
import { Issue } from "../../../models/Issues.js";
import { Participation } from "../../../models/Participations.js";
import {
  createBadRequestError,
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

  const [ownedIssues, acceptedParticipations] = await Promise.all([
    Issue.find({ ownerId: normalizedUserId, active: true }).select("_id").lean(),
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

  const ownedIssueIds = uniqueIdStrings(
    ownedIssues.map((issue) => toIdString(issue._id))
  );

  const expertIssueIds = uniqueIdStrings(
    acceptedParticipations
      .filter((participation) => participation.issue)
      .map((participation) => toIdString(participation.issue._id))
  );

  return {
    issueIds: uniqueIdStrings([...ownedIssueIds, ...expertIssueIds]),
    ownedIssueIds,
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

  const ownedIssues = await Issue.find({
    ownerId: normalizedUserId,
    active: false,
  })
    .select("_id")
    .session(session)
    .lean();

  const ownedIssueIds = uniqueIdStrings(
    ownedIssues.map((issue) => toIdString(issue._id))
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

  const allIssueIds = uniqueIdStrings([...ownedIssueIds, ...expertIssueIds]);

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
