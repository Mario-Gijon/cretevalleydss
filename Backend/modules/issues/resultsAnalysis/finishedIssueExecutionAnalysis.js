import { IssueResultsAnalysis } from "../../../models/IssueResultsAnalyses.js";
import { IssueScenario } from "../../../models/IssueScenarios.js";
import { requestGenericIssueAnalysis } from "../../../services/modelApi/genericResultsAnalysisClient.js";
import { requestModelIssueAnalysis } from "../../../services/modelApi/modelResultsAnalysisClient.js";
import { createBadRequestError } from "../../../utils/common/errors.js";
import { isValidObjectIdLike } from "../../../utils/common/mongoose.js";
import { buildIssueHistoryDocument } from "../history/index.js";
import { assertUserCanAccessIssue, getIssueByIdOrThrow } from "../shared/queries.js";
import { buildAnalysisContext } from "./buildAnalysisContext.js";
import { projectExecutionAnalysisContext } from "./projectExecutionAnalysisContext.js";

const MAX_EXECUTIONS = 3;
const clone = (value) => JSON.parse(JSON.stringify(value));

const normalizeExecutionKeyOrThrow = (executionKey) => {
  if (typeof executionKey !== "string" || !executionKey.trim()) {
    throw createBadRequestError("executionKey is required", { field: "executionKey" });
  }
  return executionKey.trim();
};

const assertFinishedIssueAccess = async ({ issueId, userId, getIssue = getIssueByIdOrThrow }) => {
  const issue = await getIssue(issueId, { select: "ownerId active currentStage", lean: true });
  await assertUserCanAccessIssue({ issue, userId, message: "You are not allowed to access this finished issue" });
  if (issue.active !== false || issue.currentStage !== "finished") {
    throw createBadRequestError("Generic analysis is only available for finished issues", { field: "issueId" });
  }
  return issue;
};

const resolveCurrentExecutionOrThrow = async ({ issue, executionKey, scenarioModel = IssueScenario }) => {
  const key = normalizeExecutionKeyOrThrow(executionKey);
  if (key === "base") return { key, type: "base", scenarioId: null };
  if (!isValidObjectIdLike(key)) {
    throw createBadRequestError("Scenario execution is not available for this finished issue", { field: "executionKey" });
  }
  const scenario = await scenarioModel.findOne({ _id: key, issue: issue._id }).select("_id").lean();
  if (!scenario) {
    throw createBadRequestError("Scenario execution is not available for this finished issue", { field: "executionKey" });
  }
  return { key, type: "scenario", scenarioId: String(scenario._id) };
};

export const serializePersistedExecutionAnalysis = (entry) => ({
  executionKey: entry.executionKey,
  executionType: entry.executionType,
  scenarioId: entry.scenario ? String(entry.scenario) : null,
  genericAnalysis: clone(entry.genericAnalysis),
  ...(entry.stageAnalyses ? { stageAnalyses: clone(entry.stageAnalyses) } : {}),
  generatedAt: entry.generatedAt instanceof Date ? entry.generatedAt.toISOString() : entry.generatedAt,
});

const resolveAlternativeEvaluationApiModelKeyOrThrow = (analysisContext) => {
  const keys = [...new Set((analysisContext?.rounds || []).map((round) => round?.selectedExecution?.modelContext?.apiModelKey).filter((value) => typeof value === "string" && value.trim()).map((value) => value.trim()))];
  if (keys.length !== 1) {
    throw createBadRequestError("Projected alternativeEvaluation execution evidence must contain exactly one apiModelKey", { field: "analysisContext.rounds", details: { apiModelKeys: keys } });
  }
  return keys[0];
};

const criteriaWeightingAnalysisContext = (analysisContext) => {
  const execution = analysisContext?.stageExecutions?.criteriaWeighting;
  if (!execution?.selectedExecution) return null;
  return {
    ...clone(analysisContext),
    rounds: [{
      phase: execution.phase,
      selectedExecution: clone(execution.selectedExecution),
      executionAttempts: clone(execution.executionAttempts),
      evidenceRefs: clone(execution.evidenceRefs),
    }],
  };
};

const resolveCriteriaWeightingApiModelKeyOrThrow = (analysisContext) => {
  const apiModelKey = analysisContext?.stageExecutions?.criteriaWeighting?.selectedExecution?.modelContext?.apiModelKey;
  if (typeof apiModelKey !== "string" || !apiModelKey.trim()) {
    throw createBadRequestError("Projected criteriaWeighting execution evidence must contain an apiModelKey", { field: "analysisContext.stageExecutions.criteriaWeighting.selectedExecution.modelContext.apiModelKey" });
  }
  return apiModelKey.trim();
};

const generateAndReplace = async ({
  issue,
  descriptor,
  analysisModel = IssueResultsAnalysis,
  historyBuilder = buildIssueHistoryDocument,
  analysisContextBuilder = buildAnalysisContext,
  executionProjector = projectExecutionAnalysisContext,
  requestAnalysis = requestGenericIssueAnalysis,
  requestModelAnalysis = requestModelIssueAnalysis,
  now = () => new Date(),
}) => {
  const history = await historyBuilder({ issueId: issue._id });
  const context = analysisContextBuilder(history);
  const projected = executionProjector({ analysisContext: context, executionKey: descriptor.key });
  const genericAnalysis = await requestAnalysis({ analysisContext: projected.analysisContext });
  const criteriaContext = criteriaWeightingAnalysisContext(projected.analysisContext);
  const criteriaApiModelKey = criteriaContext ? resolveCriteriaWeightingApiModelKeyOrThrow(projected.analysisContext) : null;
  const criteriaAnalysis = criteriaContext ? await requestModelAnalysis({ apiModelKey: criteriaApiModelKey, analysisContext: criteriaContext }) : null;
  const apiModelKey = resolveAlternativeEvaluationApiModelKeyOrThrow(projected.analysisContext);
  const modelAnalysis = await requestModelAnalysis({ apiModelKey, analysisContext: projected.analysisContext });
  const stageAnalyses = {
    ...(criteriaContext ? { criteriaWeighting: { apiModelKey: criteriaApiModelKey, analysis: clone(criteriaAnalysis) } } : {}),
    alternativeEvaluation: { apiModelKey, analysis: clone(modelAnalysis) },
  };
  const generatedAt = now();
  const entry = await analysisModel.findOneAndUpdate(
    { issue: issue._id, executionKey: descriptor.key },
    {
      $set: {
        issue: issue._id,
        executionKey: descriptor.key,
        executionType: descriptor.type,
        scenario: descriptor.scenarioId,
        genericAnalysis: clone(genericAnalysis),
        stageAnalyses,
        generatedAt,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();
  return serializePersistedExecutionAnalysis(entry);
};

export const getOrGenerateFinishedIssueExecutionAnalysis = async ({
  issueId,
  userId,
  executionKey = "base",
  force = false,
  analysisModel = IssueResultsAnalysis,
  scenarioModel = IssueScenario,
  getIssue = getIssueByIdOrThrow,
  historyBuilder = buildIssueHistoryDocument,
  analysisContextBuilder = buildAnalysisContext,
  executionProjector = projectExecutionAnalysisContext,
  requestAnalysis = requestGenericIssueAnalysis,
  requestModelAnalysis = requestModelIssueAnalysis,
  now,
}) => {
  const issue = await assertFinishedIssueAccess({ issueId, userId, getIssue });
  const descriptor = await resolveCurrentExecutionOrThrow({ issue, executionKey, scenarioModel });
  if (!force) {
    const existing = await analysisModel.findOne({ issue: issue._id, executionKey: descriptor.key }).lean();
    if (existing) return serializePersistedExecutionAnalysis(existing);
  }
  return generateAndReplace({ issue, descriptor, analysisModel, historyBuilder, analysisContextBuilder, executionProjector, requestAnalysis, requestModelAnalysis, now });
};

export const reloadFinishedIssueExecutionAnalyses = async ({ issueId, userId, executionKeys, ...dependencies }) => {
  if (!Array.isArray(executionKeys) || executionKeys.length < 1 || executionKeys.length > MAX_EXECUTIONS) {
    throw createBadRequestError(`executionKeys must contain between 1 and ${MAX_EXECUTIONS} entries`, { field: "executionKeys" });
  }
  const keys = executionKeys.map(normalizeExecutionKeyOrThrow);
  if (new Set(keys).size !== keys.length) {
    throw createBadRequestError("executionKeys must not contain duplicates", { field: "executionKeys" });
  }
  return Promise.all(keys.map((executionKey) => getOrGenerateFinishedIssueExecutionAnalysis({ issueId, userId, executionKey, force: true, ...dependencies })));
};

export const tryGenerateFinishedIssueExecutionAnalysis = async (input) => {
  try {
    return await getOrGenerateFinishedIssueExecutionAnalysis({ ...input, force: false });
  } catch {
    return null;
  }
};

export const listPersistedIssueExecutionAnalyses = async ({ issueId, analysisModel = IssueResultsAnalysis }) => {
  const entries = await analysisModel.find({ issue: issueId }).sort({ executionKey: 1 }).lean();
  return entries.map(serializePersistedExecutionAnalysis);
};
