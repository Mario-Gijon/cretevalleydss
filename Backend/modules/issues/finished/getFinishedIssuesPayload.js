import { Issue } from "../../../models/Issues.js";
import { IssueStageResult } from "../../../models/IssueStageResults.js";
import { sameId, toIdString } from "../../../utils/common/ids.js";
import { getUserFinishedIssueIds } from "../shared/queries.js";

const TOP_ALTERNATIVES_LIMIT = 3;

const normalizeTopAlternatives = (rankedAlternatives) =>
  (Array.isArray(rankedAlternatives) ? rankedAlternatives : [])
    .map((alternative, index) => ({
      alternativeId: toIdString(alternative?.alternativeId),
      name:
        typeof alternative?.name === "string" && alternative.name.trim()
          ? alternative.name.trim()
          : null,
      rank: Number(alternative?.rank),
      score: alternative?.score,
      index,
    }))
    .filter(
      (alternative) =>
        alternative.alternativeId &&
        alternative.name &&
        Number.isFinite(alternative.rank) &&
        alternative.rank > 0 &&
        typeof alternative.score === "number" &&
        Number.isFinite(alternative.score)
    )
    .sort(
      (left, right) =>
        left.rank - right.rank || left.index - right.index
    )
    .slice(0, TOP_ALTERNATIVES_LIMIT)
    .map(({ alternativeId, name, rank, score }) => ({
      alternativeId,
      name,
      rank,
      score,
    }));

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

  const stageResults = await IssueStageResult.find({
    issue: { $in: issues.map((issue) => issue._id) },
    stage: "alternativeEvaluation",
  })
    .select("issue consensusPhase result.standardResult.rankedAlternatives")
    .sort({ issue: 1, consensusPhase: -1, _id: -1 })
    .lean();
  const finalResultByIssueId = new Map();

  stageResults.forEach((stageResult) => {
    const issueId = toIdString(stageResult.issue);
    if (issueId && !finalResultByIssueId.has(issueId)) {
      finalResultByIssueId.set(issueId, stageResult);
    }
  });

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
    topAlternatives: normalizeTopAlternatives(
      finalResultByIssueId.get(toIdString(issue._id))?.result?.standardResult
        ?.rankedAlternatives
    ),
  }));
};
