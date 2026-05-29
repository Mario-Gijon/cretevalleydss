import { Alternative } from "../../../models/Alternatives.js";
import { Consensus } from "../../../models/Consensus.js";
import { Criterion } from "../../../models/Criteria.js";
import { Issue } from "../../../models/Issues.js";
import { Participation } from "../../../models/Participations.js";
import { toIdString } from "../../../utils/common/ids.js";
import { getVisibleActiveIssueIdsForUser } from "../shared/queries.js";
import { buildActiveIssueCollections } from "./activeIssue.collections.js";
import {
  buildActiveIssuesResponseMeta,
  buildEmptyActiveIssuesPayload,
  getEmptyTasksByType,
  sortActiveIssues,
  sortActiveTasksByType,
} from "./activeIssue.response.js";
import { buildActiveIssueView } from "./activeIssue.view.js";

export const getActiveIssuesPayload = async ({ userId }) => {
  const normalizedUserId = toIdString(userId);
  const { issueIds, adminIssueIds } = await getVisibleActiveIssueIdsForUser(
    normalizedUserId
  );

  if (issueIds.length === 0) {
    return buildEmptyActiveIssuesPayload();
  }

  const adminIssueIdSet = new Set(adminIssueIds);

  const [issues, allParticipations, alternatives, criteria, consensusPhases] =
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
      Consensus.find({ issue: { $in: issueIds } }).lean(),
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
    consensusPhases,
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
