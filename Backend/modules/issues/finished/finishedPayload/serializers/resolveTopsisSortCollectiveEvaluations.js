import { createInternalError } from "../../../../../utils/common/errors.js";
import { toIdString } from "../../../../../utils/common/ids.js";
import { isPlainObject } from "../../../../../utils/common/objects.js";

const API_MODEL_KEY = "topsis_sort_2016";
const fail = (message, field, details) => {
  throw createInternalError(message, { field, ...(details ? { details } : {}) });
};
const sameIdSet = (actual, expected) =>
  Array.isArray(actual) &&
  actual.length === expected.length &&
  new Set(actual).size === expected.length &&
  expected.every((id) => actual.includes(id));

const stableValue = (value) => {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, stableValue(value[key])])
  );
};
const sameValue = (left, right) =>
  JSON.stringify(stableValue(left)) === JSON.stringify(stableValue(right));

const validateCanonicalMatrixOrThrow = ({
  matrix,
  alternatives,
  criteria,
  expressionDomains,
  field,
}) => {
  if (!isPlainObject(matrix)) fail("Stored TOPSIS-Sort collective matrix is invalid", field);
  const alternativeIds = alternatives.map((entry) => entry.id);
  const criterionIds = criteria.map((entry) => entry.id);
  const matrixAlternativeIds = Object.keys(matrix);
  if (!sameIdSet(matrixAlternativeIds, alternativeIds)) {
    fail("Stored TOPSIS-Sort collective matrix does not match Issue alternatives", field);
  }
  const domainsById = new Map(expressionDomains.map((domain) => [domain.id, domain]));
  for (const alternativeId of alternativeIds) {
    const row = matrix[alternativeId];
    if (!isPlainObject(row) || !sameIdSet(Object.keys(row), criterionIds)) {
      fail("Stored TOPSIS-Sort collective matrix does not match Issue criteria", field, {
        alternativeId,
      });
    }
    for (const criterion of criteria) {
      const value = row[criterion.id];
      const domain = domainsById.get(criterion.expressionDomainId);
      if (
        typeof value !== "number" ||
        !Number.isFinite(value) ||
        !domain ||
        !["numericContinuous", "numericDiscrete"].includes(domain.typeKey) ||
        typeof domain.definition?.min !== "number" ||
        typeof domain.definition?.max !== "number" ||
        !Number.isFinite(domain.definition.min) ||
        !Number.isFinite(domain.definition.max) ||
        domain.definition.min >= domain.definition.max ||
        value < domain.definition.min ||
        value > domain.definition.max
      ) {
        fail("Stored TOPSIS-Sort collective matrix contains a value outside its numeric domain", field, {
          alternativeId,
          criterionId: criterion.id,
        });
      }
    }
  }
  return matrix;
};

const assertAppliedAttemptIdentityOrThrow = ({
  issue,
  rawPhaseResult,
  attempt,
  alternatives,
  criteria,
  expressionDomains,
  evaluations,
}) => {
  const phase = rawPhaseResult.consensusPhase;
  const stageResultId = toIdString(rawPhaseResult._id);
  const attemptId = toIdString(attempt._id);
  const application = attempt.application ?? {};
  const snapshot = application.resultSnapshot ?? {};
  const body = attempt.request?.body ?? {};
  const context = body.context ?? {};

  if (
    toIdString(attempt.issue) !== toIdString(issue._id) ||
    attempt.scope !== "issueStage" ||
    attempt.evaluationStage !== "alternativeEvaluation" ||
    attempt.consensusPhase !== phase ||
    attempt.status !== "succeeded" ||
    application.status !== "applied" ||
    application.entityType !== "stageResult" ||
    toIdString(application.entityId) !== stageResultId ||
    toIdString(snapshot._id) !== stageResultId ||
    toIdString(snapshot.issue) !== toIdString(issue._id) ||
    snapshot.stage !== "alternativeEvaluation" ||
    snapshot.consensusPhase !== phase ||
    toIdString(snapshot.executionAttempt) !== attemptId ||
    toIdString(context.issue?.id) !== toIdString(issue._id) ||
    context.consensusPhase !== phase ||
    context.structure?.stage !== "alternativeEvaluation" ||
    context.structure?.key !== issue.evaluationStructureKey ||
    attempt.modelContext?.apiModelKey !== API_MODEL_KEY ||
    attempt.modelContext?.evaluationStructureKey !== issue.evaluationStructureKey ||
    attempt.modelContext?.resultStructureKey !== "sorting" ||
    attempt.modelContext?.resultStructureVersion !== 1 ||
    toIdString(attempt.modelContext?.modelId) !== toIdString(issue.model?._id || issue.model)
  ) {
    fail("Applied TOPSIS-Sort execution evidence does not match its Issue stage result", "evaluations.collective", {
      stageResultId,
      attemptId,
    });
  }

  const requestAlternativeIds = (context.alternatives ?? []).map((entry) => toIdString(entry?.id));
  const requestCriterionIds = (context.criteria ?? []).map((entry) => toIdString(entry?.id));
  const expectedCriterionIds = criteria.map((entry) => entry.id);
  if (
    !sameIdSet(requestAlternativeIds, alternatives.map((entry) => entry.id)) ||
    !sameIdSet(requestCriterionIds, expectedCriterionIds)
  ) {
    fail("Applied TOPSIS-Sort request matrix dimensions do not match the Issue", "evaluations.collective", {
      stageResultId,
      attemptId,
    });
  }
  const domainsById = new Map(expressionDomains.map((domain) => [domain.id, domain]));
  const requestCriteriaById = new Map(
    (context.criteria ?? []).map((entry) => [toIdString(entry?.id), entry])
  );
  for (const criterion of criteria) {
    const requestCriterion = requestCriteriaById.get(criterion.id);
    const domain = domainsById.get(criterion.expressionDomainId);
    if (
      !domain ||
      requestCriterion?.type !== criterion.type ||
      requestCriterion?.expressionDomain?.typeKey !== domain.typeKey ||
      !sameValue(requestCriterion?.expressionDomain?.definition, domain.definition)
    ) {
      fail("Applied TOPSIS-Sort request domains do not match the Issue snapshots", "evaluations.collective", {
        criterionId: criterion.id,
      });
    }
  }

  const requestEvaluations = body.evaluations;
  const phaseEvaluations = evaluations.filter(
    (entry) =>
      entry.stage === "alternativeEvaluation" &&
      entry.consensusPhase === phase &&
      entry.completed === true
  );
  const requestByExpertId = new Map(
    (Array.isArray(requestEvaluations) ? requestEvaluations : []).map((entry) => [
      toIdString(entry?.expert?.id),
      entry,
    ])
  );
  if (
    requestByExpertId.size !== phaseEvaluations.length ||
    phaseEvaluations.some((entry) => {
      const expertId = toIdString(entry.expert?._id || entry.expert);
      const requestEntry = requestByExpertId.get(expertId);
      return !requestEntry || !sameValue(requestEntry.payload, entry.payload);
    })
  ) {
    fail("Applied TOPSIS-Sort request experts do not match the stored phase evaluations", "evaluations.collective", {
      stageResultId,
      attemptId,
    });
  }
};

const matrixFromAnalysisFactsOrThrow = ({ facts, alternatives, criteria, expressionDomains }) => {
  const rows = facts.collectiveEvaluations;
  if (!Array.isArray(rows) || rows.length !== alternatives.length) {
    fail("TOPSIS-Sort analysis evidence does not contain a complete collective matrix", "evaluations.collective");
  }
  const matrix = {};
  for (const row of rows) {
    const alternativeId = toIdString(row?.alternativeId);
    if (!alternativeId || Object.hasOwn(matrix, alternativeId) || !isPlainObject(row?.valuesByCriterionId)) {
      fail("TOPSIS-Sort analysis evidence contains an invalid collective row", "evaluations.collective");
    }
    matrix[alternativeId] = row.valuesByCriterionId;
  }
  return validateCanonicalMatrixOrThrow({
    matrix,
    alternatives,
    criteria,
    expressionDomains,
    field: "evaluations.collective",
  });
};

/**
 * Resolve the TOPSIS-Sort collective only from its persisted result or from
 * Model Analysis facts tied to the exact applied execution attempt. Analysis
 * facts are generated by the Python evidence pipeline from that attempt's
 * frozen request, so this read projection does not re-aggregate evaluations.
 */
export const resolveTopsisSortCollectiveEvaluations = ({
  issue,
  rawPhaseResult,
  executionAttempts = [],
  resultsAnalyses = [],
  alternatives,
  criteria,
  expressionDomains,
  evaluations,
}) => {
  if (
    issue.apiModelKey !== API_MODEL_KEY ||
    rawPhaseResult?.stage !== "alternativeEvaluation"
  ) return undefined;

  const expectedCriteria = criteria.nodes.filter((criterion) => criterion.isLeaf);
  const persisted = rawPhaseResult.result?.standardResult?.collectiveEvaluations;
  if (isPlainObject(persisted) && Object.keys(persisted).length > 0) {
    return validateCanonicalMatrixOrThrow({
      matrix: persisted,
      alternatives,
      criteria: expectedCriteria,
      expressionDomains,
      field: "evaluations.collective",
    });
  }

  const attemptId = toIdString(rawPhaseResult.executionAttempt);
  if (!attemptId) return null;
  const attempt = executionAttempts.find((entry) => toIdString(entry._id) === attemptId);
  if (!attempt) return null;
  assertAppliedAttemptIdentityOrThrow({
    issue,
    rawPhaseResult,
    attempt,
    alternatives,
    criteria: expectedCriteria,
    expressionDomains,
    evaluations,
  });

  const persistedAnalysis = resultsAnalyses.find(
    (entry) => entry.executionKey === "base" && entry.executionType === "base"
  );
  const modelAnalysis = persistedAnalysis?.stageAnalyses?.alternativeEvaluation;
  const facts = modelAnalysis?.analysis?.facts;
  if (
    modelAnalysis?.apiModelKey !== API_MODEL_KEY ||
    facts?.status !== "available" ||
    facts.sourcePhase !== rawPhaseResult.consensusPhase
  ) return null;
  if (toIdString(facts.executionId) !== attemptId || typeof facts.comparisonKey !== "string" || !facts.comparisonKey) {
    fail("TOPSIS-Sort analysis evidence does not identify the applied execution", "evaluations.collective", {
      stageResultId: toIdString(rawPhaseResult._id),
      attemptId,
    });
  }

  return matrixFromAnalysisFactsOrThrow({
    facts,
    alternatives,
    criteria: expectedCriteria,
    expressionDomains,
  });
};
