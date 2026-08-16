import { Alternative } from "../../../../../models/Alternatives.js";
import { Criterion } from "../../../../../models/Criteria.js";
import { IssueEvaluation } from "../../../../../models/IssueEvaluations.js";
import { IssueExpressionDomain } from "../../../../../models/IssueExpressionDomains.js";
import { IssueModel } from "../../../../../models/IssueModels.js";
import { IssueScenario } from "../../../../../models/IssueScenarios.js";
import { IssueResultsAnalysis } from "../../../../../models/IssueResultsAnalyses.js";
import { IssueStageResult } from "../../../../../models/IssueStageResults.js";
import { Participation } from "../../../../../models/Participations.js";
import { ExitUserIssue } from "../../../../../models/ExitUserIssue.js";

const USER_SELECT = "_id name email university";

export const loadFinishedIssueData = async ({ issue }) => {
  const issueId = issue._id;
  const [
    alternatives,
    criteria,
    expressionDomains,
    participations,
    evaluations,
    phaseResults,
    compatibleModels,
    scenarios,
    resultsAnalyses,
    exitUsers,
  ] = await Promise.all([
    Alternative.find({ issue: issueId }).sort({ position: 1, _id: 1 }).lean(),
    Criterion.find({ issue: issueId }).lean(),
    IssueExpressionDomain.find({ issue: issueId }).lean(),
    Participation.find({ issue: issueId }).populate("expert", USER_SELECT).lean(),
    IssueEvaluation.find({ issue: issueId })
      .populate("expert", USER_SELECT)
      .sort({ stage: 1, consensusPhase: 1, _id: 1 })
      .lean(),
    IssueStageResult.find({ issue: issueId })
      .sort({ stage: 1, consensusPhase: 1, _id: 1 })
      .lean(),
    IssueModel.find({
      modelKind: "issue",
      visibleInIssueCreation: true,
      "manifestSync.isStale": false,
    }).lean(),
    IssueScenario.find({ issue: issueId })
      .populate("createdBy", USER_SELECT)
      .populate("targetModel", "name moreInfoUrl")
      .sort({ createdAt: -1, _id: -1 })
      .lean(),
    IssueResultsAnalysis.find({ issue: issueId }).lean(),
    ExitUserIssue.find({ issue: issueId })
      .populate("user", USER_SELECT)
      .lean(),
  ]);

  return {
    alternatives,
    criteria,
    expressionDomains,
    participations,
    evaluations,
    phaseResults,
    compatibleModels,
    scenarios,
    resultsAnalyses,
    exitUsers,
  };
};
