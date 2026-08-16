import { Alternative } from "../../../models/Alternatives.js";
import { Criterion } from "../../../models/Criteria.js";
import { IssueEvaluation } from "../../../models/IssueEvaluations.js";
import { IssueEvaluationRevision } from "../../../models/IssueEvaluationRevisions.js";
import { IssueEvent } from "../../../models/IssueEvents.js";
import { ExitUserIssue } from "../../../models/ExitUserIssue.js";
import { IssueExpressionDomain } from "../../../models/IssueExpressionDomains.js";
import { Issue } from "../../../models/Issues.js";
import { IssueScenario } from "../../../models/IssueScenarios.js";
import { IssueResultsAnalysis } from "../../../models/IssueResultsAnalyses.js";
import { IssueStageResult } from "../../../models/IssueStageResults.js";
import { IssueExecutionAttempt } from "../../../models/IssueExecutionAttempts.js";
import { IssueStateSnapshot } from "../../../models/IssueStateSnapshots.js";
import { Notification } from "../../../models/Notifications.js";
import { Participation } from "../../../models/Participations.js";
import { purgeDeletedUserIfUnreferenced } from "../../auth/deletedUserPurge.js";

import { applyOptionalSession } from "../../../utils/common/mongoose.js";
import { uniqueIdStrings } from "../../../utils/common/ids.js";

export const deleteIssueCascade = async ({ issueId, session = null }) => {
  const [issue, participations, evaluations, revisions, events, exitLogs, notifications, scenarios] =
    await Promise.all([
      applyOptionalSession(
        Issue.findById(issueId).select("ownerId createdBy").lean(),
        session
      ),
      applyOptionalSession(
        Participation.find({ issue: issueId }).select("expert").lean(),
        session
      ),
      applyOptionalSession(
        IssueEvaluation.find({ issue: issueId }).select("expert").lean(),
        session
      ),
      applyOptionalSession(
        IssueEvaluationRevision.find({ issue: issueId })
          .select("expert actorUser")
          .lean(),
        session
      ),
      applyOptionalSession(
        IssueEvent.find({ issue: issueId })
          .select("actorUser subjectUser")
          .lean(),
        session
      ),
      applyOptionalSession(
        ExitUserIssue.find({ issue: issueId }).select("user").lean(),
        session
      ),
      applyOptionalSession(
        Notification.find({ issue: issueId }).select("expert").lean(),
        session
      ),
      applyOptionalSession(
        IssueScenario.find({ issue: issueId }).select("createdBy").lean(),
        session
      ),
    ]);

  const purgeCandidateUserIds = uniqueIdStrings([
    issue?.ownerId,
    issue?.createdBy,
    ...participations.map((participation) => participation.expert),
    ...evaluations.map((evaluation) => evaluation.expert),
    ...revisions.flatMap((revision) => [revision.expert, revision.actorUser]),
    ...events.flatMap((event) => [event.actorUser, event.subjectUser]),
    ...exitLogs.map((exitLog) => exitLog.user),
    ...notifications.map((notification) => notification.expert),
    ...scenarios.map((scenario) => scenario.createdBy),
  ]);

  await Promise.all([
    applyOptionalSession(IssueEvaluation.deleteMany({ issue: issueId }), session),
    applyOptionalSession(
      IssueEvaluationRevision.deleteMany({ issue: issueId }),
      session
    ),
    applyOptionalSession(IssueEvent.deleteMany({ issue: issueId }), session),
    applyOptionalSession(Alternative.deleteMany({ issue: issueId }), session),
    applyOptionalSession(Criterion.deleteMany({ issue: issueId }), session),
    applyOptionalSession(Participation.deleteMany({ issue: issueId }), session),
    applyOptionalSession(Notification.deleteMany({ issue: issueId }), session),
    applyOptionalSession(IssueExpressionDomain.deleteMany({ issue: issueId }), session),
    applyOptionalSession(ExitUserIssue.deleteMany({ issue: issueId }), session),
    applyOptionalSession(IssueScenario.deleteMany({ issue: issueId }), session),
    applyOptionalSession(IssueResultsAnalysis.deleteMany({ issue: issueId }), session),
    applyOptionalSession(IssueStageResult.deleteMany({ issue: issueId }), session),
    applyOptionalSession(IssueExecutionAttempt.deleteMany({ issue: issueId }), session),
    applyOptionalSession(IssueStateSnapshot.deleteMany({ issue: issueId }), session),
  ]);

  await applyOptionalSession(Issue.deleteOne({ _id: issueId }), session);

  for (const userId of purgeCandidateUserIds) {
    await purgeDeletedUserIfUnreferenced({
      userId,
      session,
    });
  }
};
