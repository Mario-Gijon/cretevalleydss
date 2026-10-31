import SortingDashboardResult from "./SortingDashboardResult.jsx";
import SortingFinishedIssueCardSummary from "./SortingFinishedIssueCardSummary.jsx";
import CategoryRoundedIcon from "@mui/icons-material/CategoryRounded";
import {
  buildTopsisSortCategoryIntervals,
  buildTopsisSort2016Findings,
  isTopsisSort2016Execution,
} from "../../../modelFindings/topsis_sort_2016.js";
import {
  buildAHPSortIGroupEvidence,
  buildAHPSortIEvidence,
  buildAHPSortIFindings,
  isAHPSortIExecution,
} from "../../../modelFindings/ahp_sort_i.js";

const ORDER_SEMANTICS = "lower-order-is-less-preferred";
const asArray = (value) => Array.isArray(value) ? value : [];
const nonEmptyString = (value) => typeof value === "string" && value.trim() ? value : null;
const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isNormalizedPriority = (value) => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
const AHP_PRIORITY_EVIDENCE_TOLERANCE = 1e-12;
const BINARY_DECISION_THRESHOLD = 0.5;

const unavailable = (reason) => ({ available: false, unavailableReason: reason, categories: [], assignmentCount: 0 });

const hasConsistentAHPSortPriorityEvidence = (evidence) => {
  const criteria = evidence?.criteria;
  if (evidence?.status !== "available" || evidence.detailsAvailable !== true || !Array.isArray(criteria) || !criteria.length) return false;
  if (criteria.some((criterion) => [criterion.weight, criterion.alternativeLocalPriority, criterion.weightedContribution]
    .some((value) => typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1))) return false;
  const contributionsMatchLocalPriorities = criteria.every((criterion) =>
    Math.abs(criterion.weight * criterion.alternativeLocalPriority - criterion.weightedContribution) <= AHP_PRIORITY_EVIDENCE_TOLERANCE,
  );
  const evidencePriority = criteria.reduce((sum, criterion) => sum + criterion.weightedContribution, 0);
  return contributionsMatchLocalPriorities && Math.abs(evidencePriority - evidence.globalPriority) <= AHP_PRIORITY_EVIDENCE_TOLERANCE;
};

const ahpProfileReferencesFor = (evidence) => {
  const references = evidence?.profilePriorities;
  if (!Array.isArray(references) || references.length === 0) return [];
  const ids = new Set();
  if (references.some((reference) => {
    const valid = nonEmptyString(reference?.id) && nonEmptyString(reference?.label) &&
      typeof reference.priority === "number" && Number.isFinite(reference.priority) &&
      reference.priority >= 0 && reference.priority <= 1 && !ids.has(reference.id);
    if (valid) ids.add(reference.id);
    return !valid;
  })) return [];
  return references.map(({ id, label, priority }) => ({ id, label, value: priority }));
};

const valuesAreClose = (left, right) => typeof left === "number" && Number.isFinite(left) &&
  typeof right === "number" && Number.isFinite(right) &&
  Math.abs(left - right) <= AHP_PRIORITY_EVIDENCE_TOLERANCE;

const hasComparableBinaryAHPSortEvidence = ({ categories, alternativeIds, evidence }) => {
  if (
    evidence?.status !== "available" || evidence.profileMode !== "limiting" ||
    categories.length !== 2 || alternativeIds.length === 0
  ) return false;

  const orderedCategories = categories.slice().sort((left, right) => left.order - right.order);
  const expectedEvidenceKeys = [...alternativeIds].sort();
  const actualEvidenceKeys = Object.keys(evidence.alternativesById || {}).sort();
  if (actualEvidenceKeys.length !== expectedEvidenceKeys.length ||
    actualEvidenceKeys.some((id, index) => id !== expectedEvidenceKeys[index])) return false;

  let sharedProfileId = null;
  let sharedCriterionIds = null;
  let sharedWeights = null;

  for (const alternativeId of alternativeIds) {
    const alternativeEvidence = evidence.alternativesById[alternativeId];
    if (
      alternativeEvidence?.status !== "available" || alternativeEvidence.alternative?.id !== alternativeId ||
      !orderedCategories.some((category) => category.id === alternativeEvidence.category?.id) ||
      !Array.isArray(alternativeEvidence.profilePriorities) || alternativeEvidence.profilePriorities.length !== 1 ||
      !isRecord(alternativeEvidence.profilePriorities[0]) ||
      !nonEmptyString(alternativeEvidence.profilePriorities[0].id) ||
      !isNormalizedPriority(alternativeEvidence.profilePriorities[0].priority) ||
      !Array.isArray(alternativeEvidence.criteria) || alternativeEvidence.criteria.length === 0 ||
      !hasConsistentAHPSortPriorityEvidence(alternativeEvidence)
    ) return false;

    const profileReference = alternativeEvidence.profilePriorities[0];
    if (sharedProfileId === null) sharedProfileId = profileReference.id;
    else if (profileReference.id !== sharedProfileId) return false;

    const rowsByCriterion = new Map(alternativeEvidence.criteria.map((row) => [row.id, row]));
    if (rowsByCriterion.size !== alternativeEvidence.criteria.length || [...rowsByCriterion.keys()].some((id) => !nonEmptyString(id))) return false;
    const criterionIds = [...rowsByCriterion.keys()].sort();
    if (sharedCriterionIds === null) sharedCriterionIds = criterionIds;
    else if (criterionIds.length !== sharedCriterionIds.length || criterionIds.some((id, index) => id !== sharedCriterionIds[index])) return false;

    const weights = new Map();
    let weightTotal = 0;
    let alternativeContributionTotal = 0;
    let profileContributionTotal = 0;
    for (const [criterionId, row] of rowsByCriterion) {
      const localProfile = row.profileLocalPriorities?.[0]?.value;
      const profileContribution = row.profileWeightedContributions?.[0]?.value;
      const matrix = row.matrix?.values;
      const ratio = matrix?.[0]?.[1];
      const reciprocal = matrix?.[1]?.[0];
      if (
        !isNormalizedPriority(row.weight) || !isNormalizedPriority(row.alternativeLocalPriority) || !isNormalizedPriority(localProfile) ||
        !isNormalizedPriority(row.weightedContribution) || typeof profileContribution !== "number" || !Number.isFinite(profileContribution) ||
        row.profileLocalPriorities.length !== 1 || row.profileWeightedContributions.length !== 1 ||
        !Array.isArray(matrix) || matrix.length !== 2 || matrix.some((line) => !Array.isArray(line) || line.length !== 2 || line.some((value) => typeof value !== "number" || !Number.isFinite(value))) ||
        !valuesAreClose(matrix[0][0], 1) || !valuesAreClose(matrix[1][1], 1) ||
        typeof ratio !== "number" || ratio <= 0 || typeof reciprocal !== "number" || reciprocal <= 0 ||
        !valuesAreClose(ratio * reciprocal, 1)
      ) return false;

      const matrixAlternativePriority = ratio / (1 + ratio);
      const matrixProfilePriority = 1 / (1 + ratio);
      if (
        !valuesAreClose(matrixAlternativePriority, row.alternativeLocalPriority) ||
        !valuesAreClose(matrixProfilePriority, localProfile) ||
        !valuesAreClose(row.alternativeLocalPriority + localProfile, 1) ||
        !valuesAreClose(row.weight * row.alternativeLocalPriority, row.weightedContribution) ||
        !valuesAreClose(row.weight * localProfile, profileContribution)
      ) return false;

      if (sharedWeights && !valuesAreClose(row.weight, sharedWeights.get(criterionId))) return false;
      weights.set(criterionId, row.weight);
      weightTotal += row.weight;
      alternativeContributionTotal += row.weightedContribution;
      profileContributionTotal += profileContribution;
    }

    if (
      !valuesAreClose(weightTotal, 1) ||
      !valuesAreClose(alternativeContributionTotal, alternativeEvidence.globalPriority) ||
      !valuesAreClose(profileContributionTotal, profileReference.priority) ||
      !valuesAreClose(alternativeEvidence.globalPriority + profileReference.priority, 1)
    ) return false;

    const upperCategory = orderedCategories[1];
    const lowerCategory = orderedCategories[0];
    const categoryFromExistingRule = alternativeEvidence.globalPriority >= profileReference.priority
      ? upperCategory
      : lowerCategory;
    const categoryFromThreshold = alternativeEvidence.globalPriority >= BINARY_DECISION_THRESHOLD
      ? upperCategory
      : lowerCategory;
    if (
      alternativeEvidence.category.id !== categoryFromExistingRule.id ||
      alternativeEvidence.category.id !== categoryFromThreshold.id
    ) return false;

    if (sharedWeights === null) sharedWeights = weights;
  }

  return true;
};

const normalizeSortingDashboardResult = ({ execution, alternatives, criteria }) => {
  const output = execution?.standardizedOutput;
  if (!output || typeof output !== "object") return unavailable("The stored sorting result is unavailable.");
  if (output.categoryOrderSemantics !== ORDER_SEMANTICS) {
    return unavailable("The stored sorting result has unsupported category order semantics.");
  }

  const categoriesInput = asArray(output.categories);
  const assignmentsInput = asArray(output.assignments);
  const alternativeById = new Map(asArray(alternatives).map((alternative) => [alternative?.id, alternative]));
  const alternativeIds = [...alternativeById.keys()];
  if (alternativeById.size !== asArray(alternatives).length) {
    return unavailable("The alternatives contain duplicate or missing IDs, so this result cannot be resolved safely.");
  }
  if (!categoriesInput.length) return unavailable("The stored sorting result does not contain configured categories.");

  const categoryIds = new Set();
  const categoryOrders = new Set();
  const categories = [];
  for (const category of categoriesInput) {
    const id = nonEmptyString(category?.categoryId);
    const label = nonEmptyString(category?.label);
    const order = category?.order;
    if (!id || !label || !Number.isInteger(order) || order < 0 || categoryIds.has(id) || categoryOrders.has(order)) {
      return unavailable("The stored sorting result contains invalid category data.");
    }
    categoryIds.add(id);
    categoryOrders.add(order);
    categories.push({ id, label, order, alternatives: [] });
  }
  if (categories.some((category, index) => !categoryOrders.has(index)) || categoryOrders.size !== categories.length) {
    return unavailable("The stored sorting categories do not have a complete configured order.");
  }
  const categoriesById = new Map(categories.map((category) => [category.id, category]));
  const assignedIds = new Set();
  for (const assignment of assignmentsInput) {
    const alternativeId = nonEmptyString(assignment?.alternativeId);
    const categoryId = nonEmptyString(assignment?.categoryId);
    const alternative = alternativeById.get(alternativeId);
    const category = categoriesById.get(categoryId);
    if (!alternativeId || !categoryId || !alternative || !category || assignedIds.has(alternativeId) || typeof alternative.name !== "string") {
      return unavailable("The stored sorting assignments contain unknown or duplicate IDs.");
    }
    assignedIds.add(alternativeId);
    category.alternatives.push({ id: alternativeId, name: alternative.name });
  }
  if (alternativeIds.some((id) => !assignedIds.has(id))) {
    return unavailable("The stored sorting result does not assign every alternative.");
  }

  categories.sort((left, right) => right.order - left.order);
  const ahpSortI = isAHPSortIExecution(execution);
  const ahpSortIGroup = ahpSortI
    ? buildAHPSortIGroupEvidence({ result: { categories, assignmentCount: assignedIds.size }, execution, criteria })
    : null;
  const ahpSortIEvidence = ahpSortI
    ? buildAHPSortIEvidence({ result: { categories, assignmentCount: assignedIds.size }, execution, criteria })
    : null;
  const relativeClosenessByAlternativeId = output.diagnostics?.closeness_by_alternative_id;
  const metricValueFor = (alternativeId) => {
    const value = relativeClosenessByAlternativeId?.[alternativeId];
    return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1 ? value : null;
  };
  const categoryIntervals = isRecord(relativeClosenessByAlternativeId)
    ? buildTopsisSortCategoryIntervals({ categories, assignmentCount: assignedIds.size }, execution)
    : null;
  for (const category of categories) {
    category.metricRange = categoryIntervals?.get(category.id) ?? null;
    category.alternatives = category.alternatives.map((alternative) => ({
      ...alternative,
      metricValue: metricValueFor(alternative.id),
    }));
  }
  const hasRelativeCloseness = categories.some((category) => category.alternatives.some((alternative) => alternative.metricValue !== null));
  const ahpMetricValuesByAlternativeId = {};
  const rawAHPSortDiagnostics = output.diagnostics;
  const hasAHPSortDiagnosticIdentity = rawAHPSortDiagnostics?.modelKey === "ahp_sort_i" &&
    ["limiting", "central"].includes(rawAHPSortDiagnostics.profileMode) &&
    isRecord(rawAHPSortDiagnostics.resultsByAlternativeId);
  let ahpMetricAvailable = assignedIds.size > 0 && !ahpSortIGroup && ahpSortIEvidence !== null;
  let hasContextualProfileReferences = false;
  if (ahpMetricAvailable) {
    for (const category of categories) {
      for (const alternative of category.alternatives) {
        const evidence = ahpSortIEvidence.alternativesById?.[alternative.id];
        if (ahpSortIEvidence.status === "integrity_warning" || evidence?.status === "integrity_warning") {
          ahpMetricAvailable = false;
          break;
        }
        const detailedEvidenceIsConsistent = evidence?.status === "available" &&
          evidence.alternative?.id === alternative.id && evidence.category?.id === category.id &&
          hasConsistentAHPSortPriorityEvidence(evidence);
        const rawDiagnostics = rawAHPSortDiagnostics?.resultsByAlternativeId?.[alternative.id];
        const mayUseSavedScalarWithoutDetail = evidence?.status === "unavailable" ||
          (evidence?.status === "available" && evidence.detailsAvailable !== true);
        const storedPriority = detailedEvidenceIsConsistent
          ? evidence.globalPriority
          : mayUseSavedScalarWithoutDetail && hasAHPSortDiagnosticIdentity && rawDiagnostics?.categoryId === category.id
            ? rawDiagnostics.globalPriority
            : null;
        if (typeof storedPriority !== "number" || !Number.isFinite(storedPriority) || storedPriority < 0 || storedPriority > 1) {
          ahpMetricAvailable = false;
          break;
        }
        const references = detailedEvidenceIsConsistent ? ahpProfileReferencesFor(evidence) : [];
        hasContextualProfileReferences ||= references.length > 0;
        ahpMetricValuesByAlternativeId[alternative.id] = { value: storedPriority, references };
      }
      if (!ahpMetricAvailable) break;
    }
  }
  const hasSharedBinaryDecisionThreshold = ahpMetricAvailable && hasComparableBinaryAHPSortEvidence({
    categories,
    alternativeIds,
    evidence: ahpSortIEvidence,
  });
  const ahpMetric = ahpMetricAvailable
    ? {
      key: "globalPriority",
      label: "Global AHP priority",
      minimum: 0,
      maximum: 1,
      precision: 4,
      comparableAcrossAlternatives: hasSharedBinaryDecisionThreshold,
      visualization: hasSharedBinaryDecisionThreshold
        ? "bounded-position"
        : hasContextualProfileReferences ? "contextual-reference" : "value-only",
      referenceScope: hasSharedBinaryDecisionThreshold
        ? "shared-decision-threshold"
        : hasContextualProfileReferences ? "alternative" : null,
      ...(hasSharedBinaryDecisionThreshold ? { threshold: BINARY_DECISION_THRESHOLD } : {}),
      ordering: hasSharedBinaryDecisionThreshold ? "descending-within-category" : "preserve",
    }
    : null;
  const relativeClosenessMetric = hasRelativeCloseness
    ? {
      key: "relativeCloseness",
      label: "Relative closeness",
      minimum: 0,
      maximum: 1,
      precision: 4,
      comparableAcrossAlternatives: true,
      visualization: "bounded-position",
      ordering: "descending-within-category",
    }
    : null;
  const metric = ahpSortIGroup ? null : ahpSortI ? ahpMetric : relativeClosenessMetric;
  if (ahpMetricAvailable) {
    for (const category of categories) {
      category.alternatives = category.alternatives.map((alternative) => ({
        ...alternative,
        metricValue: ahpMetricValuesByAlternativeId[alternative.id].value,
        metricReferences: hasSharedBinaryDecisionThreshold ? [] : ahpMetricValuesByAlternativeId[alternative.id].references,
      }));
      category.metricRange = null;
    }
  }
  const normalized = {
    available: true,
    unavailableReason: null,
    categories,
    assignmentCount: assignedIds.size,
    metric,
  };
  if (ahpSortIGroup) {
    normalized.ahpSortIGroup = ahpSortIGroup;
  } else if (ahpSortI) {
    normalized.ahpSortI = ahpSortIEvidence;
  }
  return normalized;
};

const buildSortingFindings = (result, execution) => {
  if (!result.available) return [];
  if (isTopsisSort2016Execution(execution)) return buildTopsisSort2016Findings(result, execution);
  if (isAHPSortIExecution(execution)) return buildAHPSortIFindings(result);

  const categories = result.categories;
  const assignmentCount = result.assignmentCount;
  const items = [
    `${categories.length} configured ${categories.length === 1 ? "category" : "categories"}.`,
    `${assignmentCount} ${assignmentCount === 1 ? "alternative classified" : "alternatives classified"}.`,
    ...categories.map((category) => `${category.label}: ${category.alternatives.length} ${category.alternatives.length === 1 ? "alternative" : "alternatives"}.`),
  ];
  const empty = categories.filter((category) => category.alternatives.length === 0);
  if (empty.length) items.push(`Empty categories: ${empty.map((category) => category.label).join(", ")}.`);

  const largest = Math.max(0, ...categories.map((category) => category.alternatives.length));
  const mostPopulated = categories.filter((category) => category.alternatives.length === largest && largest > 0);
  if (mostPopulated.length) {
    items.push(`${mostPopulated.length === 1 ? "Most populated category" : "Most populated categories"}: ${mostPopulated.map((category) => category.label).join(", ")} (${largest} ${largest === 1 ? "alternative" : "alternatives"}).`);
  }

  const preferredCategory = categories[0];
  items.push(preferredCategory.alternatives.length
    ? `Alternatives assigned to the highest-preference category (${preferredCategory.label}): ${preferredCategory.alternatives.map((alternative) => alternative.name).join(", ")}.`
    : `The highest-preference category (${preferredCategory.label}) is empty.`);
  return [{ kind: "overview", title: "Sorting summary", items }];
};

const sortingV1ResultPresentation = Object.freeze({
  resultStructureKey: "sorting",
  resultStructureVersion: 1,
  capabilities: Object.freeze({ resultsAnalysis: true }),
  DashboardResultComponent: SortingDashboardResult,
  ResultHeaderIconComponent: CategoryRoundedIcon,
  FinishedIssueCardSummaryComponent: SortingFinishedIssueCardSummary,
  normalizeDashboardResult: ({ execution, alternatives, criteria }) => normalizeSortingDashboardResult({ execution, alternatives, criteria }),
  buildDashboardFindings: buildSortingFindings,
});

export default sortingV1ResultPresentation;
