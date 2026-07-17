import { Issue } from "../../../models/Issues.js";
import { sameId, toIdString } from "../../../utils/common/ids.js";
import { getUserFinishedIssueIds } from "../shared/queries.js";

export const getFinishedIssuesPayload = async ({ userId }) => {
  const normalizedUserId = toIdString(userId);
  const issueIds = await getUserFinishedIssueIds(normalizedUserId);

  if (issueIds.length === 0) {
    return [];
  }

  const issues = await Issue.find({ _id: { $in: issueIds } })
    .populate("model", "name")
    .populate("ownerId", "email")
    .sort({ finishedAt: -1, updatedAt: -1 })
    .lean();

  return issues.map((issue) => ({
    id: toIdString(issue._id),
    name: issue.name,
    description: issue.description,
    creationDate: issue.creationDate,
    createdAt: issue.createdAt ?? null,
    updatedAt: issue.updatedAt ?? null,
    closureDate: issue.closureDate ?? null,
    finishedAt: issue.finishedAt ?? null,
    isIssueOwner: sameId(issue.ownerId?._id, normalizedUserId),
  }));
};
