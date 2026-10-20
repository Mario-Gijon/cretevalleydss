import { Issue } from "../../../models/Issues.js";
import { IssueStageResult } from "../../../models/IssueStageResults.js";
import { sameId, toIdString } from "../../../utils/common/ids.js";
import { getUserFinishedIssueIds } from "../shared/queries.js";
import { resolveResultStructureMetadata } from "../../decisionPlugins/resultStructureMetadata.js";
import {
  projectNormalizedResultOrThrow,
} from "../../decisionPlugins/resultStructures/resultStructureRegistry.js";

const TOP_ALTERNATIVES_LIMIT = 3;

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
    .select("issue consensusPhase result.resultStructureKey result.resultStructureVersion result.standardResult")
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
    ...(() => {
      const finalResult = finalResultByIssueId.get(toIdString(issue._id));
      if (!finalResult) return { topAlternatives: [] };

      const resultStructureMetadata = resolveResultStructureMetadata(
        finalResult.result ?? {}
      );
      return projectNormalizedResultOrThrow({
        ...resultStructureMetadata,
        result: finalResult.result?.standardResult ?? {},
        target: "finishedIssueListSummary",
        context: {
          limit: TOP_ALTERNATIVES_LIMIT,
          resultStructureMetadata,
        },
      });
    })(),
  }));
};
