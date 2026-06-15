import { Alternative } from "../../../models/Alternatives.js";
import { Criterion } from "../../../models/Criteria.js";
import { Issue } from "../../../models/Issues.js";
import { IssueStageResult } from "../../../models/IssueStageResults.js";
import { Participation } from "../../../models/Participations.js";
import { toIdString } from "../../../utils/common/ids.js";
import { EVALUATION_STAGES } from "../../decisionPlugins/evaluations/evaluationStages.js";
import { getVisibleActiveIssueIdsForUser } from "../shared/queries.js";
import { buildActiveIssueCollections } from "./groupActiveIssueRecords.js";
import {
  buildActiveIssuesResponseMeta,
  buildEmptyActiveIssuesPayload,
  getEmptyTasksByType,
  sortActiveIssues,
  sortActiveTasksByType,
} from "./buildActiveIssuesResponse.js";
import { buildActiveIssueView } from "./buildActiveIssueView.js";

export const getActiveIssuesPayload = async ({ userId }) => {
  const normalizedUserId = toIdString(userId);
  const { issueIds, adminIssueIds } = await getVisibleActiveIssueIdsForUser(
    normalizedUserId
  );

  if (issueIds.length === 0) {
    return buildEmptyActiveIssuesPayload();
  }

  const adminIssueIdSet = new Set(adminIssueIds);

  const [issues, allParticipations, alternatives, criteria, alternativeStageResults] =
    await Promise.all([
      Issue.find({ _id: { $in: issueIds } })
        .populate("model")
        .populate("admin", "email name")
        .lean(),
      Participation.find({ issue: { $in: issueIds } })
        .populate("expert", "email")
        .lean(),
      Alternative.find({ issue: { $in: issueIds } }).lean(),
      Criterion.find({ issue: { $in: issueIds } })
        .populate(
          "expressionDomain",
          "name type numericRange valueCount linguisticLabels"
        )
        .lean(),
      IssueStageResult.find({
        issue: { $in: issueIds },
        stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
      }).lean(),
    ]);

  const {
    participationMap,
    alternativesMap,
    criteriaMap,
    consensusHistoryByIssue,
  } = buildActiveIssueCollections({
    participations: allParticipations,
    alternatives,
    criteria,
    alternativeStageResults,
  });

  const tasksByType = getEmptyTasksByType();

  const formattedIssues = issues.map((issue) => {
    const issueId = toIdString(issue._id);
    const { issueView, taskItems } = buildActiveIssueView({
      issue,
      userId: normalizedUserId,
      adminIssueIdSet,
      issueParticipations: participationMap[issueId] || [],
      issueAlternativeDocs: alternativesMap[issueId] || [],
      issueCriteriaDocs: criteriaMap[issueId] || [],
      consensusHistoryRounds: consensusHistoryByIssue[issueId] || [],
    });

    for (const taskItem of taskItems) {
      tasksByType[taskItem.actionKey].push(taskItem);
    }

    return issueView;
  });

  sortActiveIssues(formattedIssues);
  sortActiveTasksByType(tasksByType);

  const { tasks, taskCenter, filtersMeta } = buildActiveIssuesResponseMeta({
    formattedIssues,
    tasksByType,
  });

  return {
    issues: formattedIssues,
    tasks,
    taskCenter,
    filtersMeta,
  };
};
