import { IssueResultsAnalysis } from "../../../models/IssueResultsAnalysis.js";
import { Issue } from "../../../models/Issues.js";

import { getUserFinishedIssueIds } from "../issue.queries.js";
import {
  buildIssueResultsAnalysisContext,
  buildScenarioResultsAnalysisContext,
  getAuthorizedResolvedIssueForAnalysisOrThrow,
  getAuthorizedScenarioForAnalysisOrThrow,
} from "./analysis.context.js";
import { requestResultsAnalysis } from "../../../services/modelApi/modelAnalysisClient.js";
import { toIdString } from "../../../utils/common/ids.js";

const ANALYSIS_VERSION = "1.0";

const resolvePhaseFromContext = (analysisContext, issue) => {
  const phaseFromContext = Number(analysisContext?.evaluations?.phaseUsed);
  if (Number.isInteger(phaseFromContext) && phaseFromContext > 0) {
    return phaseFromContext;
  }

  const phaseFromIssue = Number(issue?.consensusPhase);
  if (Number.isInteger(phaseFromIssue) && phaseFromIssue > 0) {
    return phaseFromIssue;
  }

  return 1;
};

const buildModelSnapshot = (analysisContext) => ({
  apiModelKey: analysisContext?.model?.apiModelKey ?? null,
  evaluationStructure: analysisContext?.model?.evaluationStructure ?? null,
  inputKind: analysisContext?.model?.inputKind ?? null,
  outputKind: analysisContext?.model?.outputKind ?? null,
  lifecycleKind: analysisContext?.model?.lifecycleKind ?? null,
  modelVersion: analysisContext?.model?.modelVersion ?? null,
  versionLabel: analysisContext?.model?.versionLabel ?? null,
});

const toResultsAnalysisDto = (doc) => {
  if (!doc) return null;

  return {
    id: toIdString(doc._id),
    issue: toIdString(doc.issue),
    scenario: toIdString(doc.scenario),
    analysisTarget: doc.analysisTarget || (doc.scenario ? "scenario" : "issue"),
    phase: doc.phase ?? null,
    status: doc.status,
    source: doc.source,
    contextVersion: doc.contextVersion ?? null,
    analysisVersion: doc.analysisVersion ?? null,
    generatedAt: doc.generatedAt ?? null,
    generatedBy: toIdString(doc.generatedBy),
    modelSnapshot: doc.modelSnapshot ?? null,
    contextWarnings: Array.isArray(doc.contextWarnings) ? doc.contextWarnings : [],
    analysis: doc.analysis ?? null,
    error: doc.error?.code || doc.error?.message ? doc.error : null,
  };
};

const saveCompletedResultsAnalysis = async ({
  issue,
  scenarioId = null,
  analysisTarget = "issue",
  userId,
  analysisContext,
  analysis,
  source = "manual",
}) => {
  const created = await IssueResultsAnalysis.create({
    issue: issue._id,
    scenario: scenarioId || null,
    analysisTarget,
    phase: resolvePhaseFromContext(analysisContext, issue),
    status: "completed",
    source,
    contextVersion: analysisContext?.contextVersion || null,
    analysisVersion: ANALYSIS_VERSION,
    generatedAt: new Date(),
    generatedBy: userId || null,
    modelSnapshot: buildModelSnapshot(analysisContext),
    contextWarnings: Array.isArray(analysisContext?.warnings)
      ? analysisContext.warnings
      : [],
    analysis,
    error: {
      code: null,
      message: null,
      details: null,
    },
  });

  return created;
};

const saveFailedResultsAnalysis = async ({
  issue,
  scenarioId = null,
  analysisTarget = "issue",
  userId,
  analysisContext,
  error,
  source = "manual",
}) => {
  const errorCode = error?.code || "RESULTS_ANALYSIS_FAILED";
  const errorMessage = error?.message || "Results analysis generation failed";
  const errorDetails = error?.details ?? null;

  const created = await IssueResultsAnalysis.create({
    issue: issue._id,
    scenario: scenarioId || null,
    analysisTarget,
    phase: resolvePhaseFromContext(analysisContext, issue),
    status: "failed",
    source,
    contextVersion: analysisContext?.contextVersion || null,
    analysisVersion: ANALYSIS_VERSION,
    generatedAt: new Date(),
    generatedBy: userId || null,
    modelSnapshot: buildModelSnapshot(analysisContext),
    contextWarnings: Array.isArray(analysisContext?.warnings)
      ? analysisContext.warnings
      : [],
    analysis: null,
    error: {
      code: errorCode,
      message: errorMessage,
      details: errorDetails,
    },
  });

  return created;
};

const getLatestIssueResultsAnalysis = async ({ issueId, scenarioId = null }) => {
  return IssueResultsAnalysis.findOne({ issue: issueId, scenario: scenarioId || null })
    .sort({ generatedAt: -1 })
    .lean();
};

const getLatestCompletedIssueResultsAnalysis = async ({ issueId, scenarioId = null }) =>
  IssueResultsAnalysis.findOne({
    issue: issueId,
    scenario: scenarioId || null,
    status: "completed",
  })
    .sort({ generatedAt: -1 })
    .lean();

const getCompletedAnalysisByIssueSourcePhase = async ({
  issueId,
  scenarioId = null,
  source,
  phase,
}) =>
  IssueResultsAnalysis.findOne({
    issue: issueId,
    scenario: scenarioId || null,
    source,
    phase,
    status: "completed",
  })
    .sort({ generatedAt: -1 })
    .lean();

const buildAndPersistResultsAnalysis = async ({
  issueId,
  scenarioId = null,
  userId,
  source = "manual",
  enforceAccess = true,
  allowResolutionDuplicateGuard = false,
}) => {
  const analysisTarget = scenarioId ? "scenario" : "issue";

  const visibleFinishedIssueIds = enforceAccess
    ? await getUserFinishedIssueIds(userId, {
        excludeHidden: true,
      })
    : [issueId];

  let issue = null;
  let analysisContext = null;

  if (scenarioId) {
    const auth = await getAuthorizedScenarioForAnalysisOrThrow({
      issueId,
      scenarioId,
      userId,
      visibleFinishedIssueIds,
    });
    issue = auth.issue;

    analysisContext = await buildScenarioResultsAnalysisContext({
      issueId,
      scenarioId,
      userId,
      visibleFinishedIssueIds,
    });
  } else {
    issue = await getAuthorizedResolvedIssueForAnalysisOrThrow({
      issueId,
      userId,
      visibleFinishedIssueIds,
    });

    analysisContext = await buildIssueResultsAnalysisContext({
      issueId,
      userId,
      visibleFinishedIssueIds,
    });
  }

  const phase = resolvePhaseFromContext(analysisContext, issue);

  if (allowResolutionDuplicateGuard && source === "resolution") {
    const existing = await getCompletedAnalysisByIssueSourcePhase({
      issueId: issue._id,
      scenarioId,
      source,
      phase,
    });

    if (existing) {
      return {
        dto: toResultsAnalysisDto(existing),
        duplicated: true,
      };
    }
  }

  try {
    const analysis = await requestResultsAnalysis({
      analysisContext,
    });

    const saved = await saveCompletedResultsAnalysis({
      issue,
      scenarioId,
      analysisTarget,
      userId,
      analysisContext,
      analysis,
      source,
    });

    return {
      dto: toResultsAnalysisDto(saved.toObject()),
      duplicated: false,
    };
  } catch (error) {
    await saveFailedResultsAnalysis({
      issue,
      scenarioId,
      analysisTarget,
      userId,
      analysisContext,
      error,
      source,
    });

    throw error;
  }
};

const persistFailedResultsAnalysisWithMinimalContext = async ({
  issueId,
  scenarioId = null,
  userId,
  source = "resolution",
  error,
}) => {
  try {
    const issue = await Issue.findById(issueId)
      .select(
        "_id apiModelKey evaluationStructure inputKind outputKind lifecycleKind modelVersion versionLabel consensusPhase"
      )
      .lean();

    if (!issue) {
      return null;
    }

    const phaseFromIssue = Number(issue?.consensusPhase);
    const phase = Number.isInteger(phaseFromIssue) && phaseFromIssue > 0
      ? phaseFromIssue
      : 1;

    const errorCode = error?.code || "RESULTS_ANALYSIS_FAILED";
    const errorMessage = error?.message || "Results analysis generation failed";
    const errorDetails = error?.details ?? null;

    const created = await IssueResultsAnalysis.create({
      issue: issue._id,
      scenario: scenarioId || null,
      analysisTarget: scenarioId ? "scenario" : "issue",
      phase,
      status: "failed",
      source,
      contextVersion: null,
      analysisVersion: ANALYSIS_VERSION,
      generatedAt: new Date(),
      generatedBy: userId || null,
      modelSnapshot: {
        apiModelKey: issue?.apiModelKey ?? null,
        evaluationStructure: issue?.evaluationStructure ?? null,
        inputKind: issue?.inputKind ?? null,
        outputKind: issue?.outputKind ?? null,
        lifecycleKind: issue?.lifecycleKind ?? null,
        modelVersion: issue?.modelVersion ?? null,
        versionLabel: issue?.versionLabel ?? null,
      },
      contextWarnings: [],
      analysis: null,
      error: {
        code: errorCode,
        message: errorMessage,
        details: errorDetails,
      },
    });

    return created.toObject();
  } catch (_error) {
    return null;
  }
};

export const generateIssueResultsAnalysisFlow = async ({ issueId, userId }) => {
  const hasPreviousCompleted = await getLatestCompletedIssueResultsAnalysis({
    issueId,
    scenarioId: null,
  });

  const source = hasPreviousCompleted ? "regeneration" : "manual";

  const { dto } = await buildAndPersistResultsAnalysis({
    issueId,
    scenarioId: null,
    userId,
    source,
    enforceAccess: true,
    allowResolutionDuplicateGuard: false,
  });
  return dto;
};

export const getSavedIssueResultsAnalysisFlow = async ({ issueId, userId }) => {
  const visibleFinishedIssueIds = await getUserFinishedIssueIds(userId, {
    excludeHidden: true,
  });

  await getAuthorizedResolvedIssueForAnalysisOrThrow({
    issueId,
    userId,
    visibleFinishedIssueIds,
  });

  const latestCompleted = await getLatestCompletedIssueResultsAnalysis({
    issueId,
    scenarioId: null,
  });
  const latest =
    latestCompleted ||
    (await getLatestIssueResultsAnalysis({
      issueId,
      scenarioId: null,
    }));

  return toResultsAnalysisDto(latest);
};

export const generateScenarioResultsAnalysisFlow = async ({
  issueId,
  scenarioId,
  userId,
}) => {
  const hasPreviousCompleted = await getLatestCompletedIssueResultsAnalysis({
    issueId,
    scenarioId,
  });

  const source = hasPreviousCompleted ? "regeneration" : "manual";

  const { dto } = await buildAndPersistResultsAnalysis({
    issueId,
    scenarioId,
    userId,
    source,
    enforceAccess: true,
    allowResolutionDuplicateGuard: false,
  });

  return dto;
};

export const getSavedScenarioResultsAnalysisFlow = async ({
  issueId,
  scenarioId,
  userId,
}) => {
  const visibleFinishedIssueIds = await getUserFinishedIssueIds(userId, {
    excludeHidden: true,
  });

  await getAuthorizedScenarioForAnalysisOrThrow({
    issueId,
    scenarioId,
    userId,
    visibleFinishedIssueIds,
  });

  const latestCompleted = await getLatestCompletedIssueResultsAnalysis({
    issueId,
    scenarioId,
  });
  const latest =
    latestCompleted ||
    (await getLatestIssueResultsAnalysis({
      issueId,
      scenarioId,
    }));

  return toResultsAnalysisDto(latest);
};

export const tryGenerateResultsAnalysisAfterResolutionFlow = async ({
  issueId,
  userId,
}) => {
  try {
    const issue = await Issue.findById(issueId).select("active").lean();
    if (!issue || issue.active) {
      return {
        status: "skipped",
        reason: "issue_not_resolved",
      };
    }

    const { duplicated } = await buildAndPersistResultsAnalysis({
      issueId,
      scenarioId: null,
      userId,
      source: "resolution",
      enforceAccess: false,
      allowResolutionDuplicateGuard: true,
    });

    if (duplicated) {
      return {
        status: "skipped",
        reason: "duplicate_completed_for_phase",
      };
    }

    return {
      status: "completed",
    };
  } catch (error) {
    const safeCode = error?.code || "RESULTS_ANALYSIS_FAILED";
    const safeMessage = error?.message || "Results analysis generation failed";
    console.error("Auto results-analysis generation failed:", {
      issueId,
      userId,
      code: safeCode,
      message: safeMessage,
    });

    await persistFailedResultsAnalysisWithMinimalContext({
      issueId,
      scenarioId: null,
      userId,
      source: "resolution",
      error,
    });

    return {
      status: "failed",
      code: safeCode,
    };
  }
};

export const scheduleResultsAnalysisAfterResolutionFlow = ({
  issueId,
  userId,
}) => {
  Promise.resolve()
    .then(() =>
      tryGenerateResultsAnalysisAfterResolutionFlow({
        issueId,
        userId,
      })
    )
    .catch((error) => {
      console.error("Scheduled auto results-analysis failed:", {
        issueId,
        userId,
        code: error?.code || "RESULTS_ANALYSIS_FAILED",
        message: error?.message || "Unexpected scheduled analysis failure",
      });
    });

  return {
    status: "scheduled",
  };
};
