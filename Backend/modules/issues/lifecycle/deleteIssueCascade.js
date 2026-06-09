import { Alternative } from "../../../models/Alternatives.js";
import { Criterion } from "../../../models/Criteria.js";
import { IssueEvaluation } from "../../../models/IssueEvaluations.js";
import { ExitUserIssue } from "../../../models/ExitUserIssue.js";
import { IssueExpressionDomain } from "../../../models/IssueExpressionDomains.js";
import { Issue } from "../../../models/Issues.js";
import { IssueScenario } from "../../../models/IssueScenarios.js";
import { IssueStageResult } from "../../../models/IssueStageResults.js";
import { Notification } from "../../../models/Notifications.js";
import { Participation } from "../../../models/Participations.js";

import { applyOptionalSession } from "../../../utils/common/mongoose.js";

export const deleteIssueCascade = async ({ issueId, session = null }) => {
  await Promise.all([
    applyOptionalSession(IssueEvaluation.deleteMany({ issue: issueId }), session),
    applyOptionalSession(Alternative.deleteMany({ issue: issueId }), session),
    applyOptionalSession(Criterion.deleteMany({ issue: issueId }), session),
    applyOptionalSession(Participation.deleteMany({ issue: issueId }), session),
    applyOptionalSession(Notification.deleteMany({ issue: issueId }), session),
    applyOptionalSession(IssueExpressionDomain.deleteMany({ issue: issueId }), session),
    applyOptionalSession(ExitUserIssue.deleteMany({ issue: issueId }), session),
    applyOptionalSession(IssueScenario.deleteMany({ issue: issueId }), session),
    applyOptionalSession(IssueStageResult.deleteMany({ issue: issueId }), session),
  ]);

  await applyOptionalSession(Issue.deleteOne({ _id: issueId }), session);
};
