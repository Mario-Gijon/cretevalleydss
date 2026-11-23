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

const unavailable = (reason) => ({ available: false, unavailableReason: reason, categories: [], assignmentCount: 0 });

const hasExactKeys = (record, expectedKeys) => {
  if (!isRecord(record)) return false;
  const actual = Object.keys(record).sort();
  const expected = [...expectedKeys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
};

const executionExpertRoster = (execution) => {
  const roster = asArray(execution?.expertRoster);
  if (roster.length) return roster;
  const snapshot = execution?.requestSnapshot;
  const experts = asArray(snapshot?.context?.experts);
  if (experts.length) return experts;
  return asArray(snapshot?.evaluations).map((evaluation) => evaluation?.expert).filter(Boolean);
};

const normalizeMetricScope = (scope, execution) => {
  if (scope === undefined) return { valid: true, value: null };
  if (!isRecord(scope) || !hasExactKeys(scope, ["kind", "id"])) return { valid: false, value: null };
  const kind = nonEmptyString(scope.kind)?.trim();
  const id = nonEmptyString(scope.id)?.trim();
  if (!kind || !id) return { valid: false, value: null };

  if (kind === "expert") {
    const roster = executionExpertRoster(execution)
      .map((expert) => ({ id: nonEmptyString(expert?.id)?.trim(), name: nonEmptyString(expert?.name)?.trim() }))
      .filter((expert) => expert.id);
    if (roster.length !== 1 || roster[0].id !== id) return { valid: false, value: null };
    return { valid: true, value: { kind, id, label: roster[0].name || id } };
  }
  return { valid: true, value: { kind, id, label: id } };
};

const normalizeDeclaredNumericMetric = ({ metric, alternativeIds, execution, isCollective }) => {
  if (!isRecord(metric)) return null;
  const metricId = nonEmptyString(metric.metricId)?.trim();
  const name = nonEmptyString(metric.name)?.trim();
  const domain = metric.domain;
  const minimum = domain?.min;
  const maximum = domain?.max;
  if (
    !metricId || !name || !isRecord(domain) || !hasExactKeys(domain, ["min", "max"]) ||
    typeof minimum !== "number" || !Number.isFinite(minimum) ||
    typeof maximum !== "number" || !Number.isFinite(maximum) || maximum <= minimum ||
    !["acrossAlternatives", "alternativeSpecific"].includes(metric.comparability) ||
    !isRecord(metric.valuesByAlternativeId) || !hasExactKeys(metric.valuesByAlternativeId, alternativeIds)
  ) return null;

  const valuesByAlternativeId = {};
  for (const alternativeId of alternativeIds) {
    const value = metric.valuesByAlternativeId[alternativeId];
    if (typeof value !== "number" || !Number.isFinite(value) || value < minimum || value > maximum) return null;
    valuesByAlternativeId[alternativeId] = value;
  }

  const resolvedScope = normalizeMetricScope(metric.scope, execution);
  if (!resolvedScope.valid) return null;
  if (isCollective && resolvedScope.value?.kind === "expert") return null;

  let referencesByAlternativeId = null;
  if (Object.hasOwn(metric, "referencesByAlternativeId")) {
    if (!isRecord(metric.referencesByAlternativeId) || !hasExactKeys(metric.referencesByAlternativeId, alternativeIds)) return null;
    referencesByAlternativeId = {};
    for (const alternativeId of alternativeIds) {
      const references = metric.referencesByAlternativeId[alternativeId];
      if (!Array.isArray(references) || references.length === 0) return null;
      const seenReferenceIds = new Set();
      const normalizedReferences = [];
      for (const reference of references) {
        const referenceId = nonEmptyString(reference?.referenceId)?.trim();
        const referenceName = reference?.name === undefined
          ? referenceId
          : nonEmptyString(reference.name)?.trim();
        const value = reference?.value;
        if (
          !isRecord(reference) || !hasExactKeys(reference, Object.hasOwn(reference, "name")
            ? ["referenceId", "name", "value"]
            : ["referenceId", "value"]) ||
          !referenceId || !referenceName || seenReferenceIds.has(referenceId) ||
          typeof value !== "number" || !Number.isFinite(value) || value < minimum || value > maximum
        ) return null;
        seenReferenceIds.add(referenceId);
        normalizedReferences.push({ id: referenceId, label: referenceName, value });
      }
      referencesByAlternativeId[alternativeId] = normalizedReferences;
    }
  }

  const comparableAcrossAlternatives = metric.comparability === "acrossAlternatives";
  const contextualReferencesAvailable = referencesByAlternativeId !== null;
  return {
    key: metricId,
    label: name,
    minimum,
    maximum,
    precision: 4,
    comparableAcrossAlternatives,
    visualization: contextualReferencesAvailable
      ? "contextual-reference"
      : comparableAcrossAlternatives ? "bounded-position" : "value-only",
    referenceScope: contextualReferencesAvailable ? "alternative" : null,
    ordering: metricId === "relative_closeness" && comparableAcrossAlternatives
      ? "descending-within-category"
      : "preserve",
    ...(resolvedScope.value ? { scope: resolvedScope.value } : {}),
    valuesByAlternativeId,
    referencesByAlternativeId,
  };
};

const hasMatchingRelativeClosenessDiagnostics = (metric, output, alternativeIds) => {
  const diagnosticsValues = output?.diagnostics?.closeness_by_alternative_id;
  return metric?.key === "relative_closeness" && metric.comparableAcrossAlternatives === true &&
    metric.minimum === 0 && metric.maximum === 1 && isRecord(diagnosticsValues) &&
    hasExactKeys(diagnosticsValues, alternativeIds) && alternativeIds.every((id) =>
      typeof diagnosticsValues[id] === "number" && Number.isFinite(diagnosticsValues[id]) &&
      diagnosticsValues[id] === metric.valuesByAlternativeId[id],
    );
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
  const hasCategoricalVoteAggregation = output.diagnostics?.aggregationMethod === "unweighted_plurality_vote";
  const capabilities = execution?.model?.capabilities;
  const hasComparableCapability = capabilities?.sortingHasComparableValues === true;
  const comparableCapabilityIsAbsent = isRecord(capabilities) &&
    !Object.hasOwn(capabilities, "sortingHasComparableValues");
  const canPresentNumericValues = capabilities?.sortingHasNumericValues === true &&
    (hasComparableCapability || comparableCapabilityIsAbsent);
  const hasDeclaredNumericMetrics = Object.hasOwn(output, "numericMetrics");
  let metric = null;
  let metricValuesByAlternativeId = {};
  let metricReferencesByAlternativeId = {};
  let categoryIntervals = null;

  if (canPresentNumericValues && hasDeclaredNumericMetrics) {
    const metrics = Array.isArray(output.numericMetrics)
      ? output.numericMetrics.map((candidate) => normalizeDeclaredNumericMetric({
        metric: candidate,
        alternativeIds,
        execution,
        isCollective: hasCategoricalVoteAggregation,
      }))
      : null;
    // Earlier model snapshots predate sortingHasComparableValues. In that
    // case, a fully validated across-alternatives metric is the compatibility
    // evidence; current snapshots must declare the capability explicitly.
    if (metrics?.length === 1 && metrics[0]?.comparableAcrossAlternatives === true) {
      [metric] = metrics;
      metricValuesByAlternativeId = metric.valuesByAlternativeId;
      metricReferencesByAlternativeId = metric.referencesByAlternativeId || {};
      if (hasMatchingRelativeClosenessDiagnostics(metric, output, alternativeIds)) {
        categoryIntervals = buildTopsisSortCategoryIntervals(
          { categories, assignmentCount: assignedIds.size },
          execution,
        );
      }
    }
  } else if (canPresentNumericValues && !hasDeclaredNumericMetrics) {
    // Historical TOPSIS-Sort records can predate numericMetrics. Keep this
    // isolated compatibility adapter; the generic contract above never
    // branches on a model name.
    if (isTopsisSort2016Execution(execution)) {
      const legacyClosenessByAlternativeId = output.diagnostics?.closeness_by_alternative_id;
      for (const alternativeId of alternativeIds) {
        const value = legacyClosenessByAlternativeId?.[alternativeId];
        metricValuesByAlternativeId[alternativeId] = typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1
          ? value
          : null;
      }
      const hasRelativeCloseness = Object.values(metricValuesByAlternativeId).some((value) => value !== null);
      if (hasRelativeCloseness) {
        metric = {
          key: "relativeCloseness",
          label: "Relative closeness",
          minimum: 0,
          maximum: 1,
          precision: 4,
          comparableAcrossAlternatives: true,
          visualization: "bounded-position",
          ordering: "descending-within-category",
        };
        categoryIntervals = buildTopsisSortCategoryIntervals(
          { categories, assignmentCount: assignedIds.size },
          execution,
        );
      }
    }
  }

  for (const category of categories) {
    category.metricRange = categoryIntervals?.get(category.id) ?? null;
    category.alternatives = category.alternatives.map((alternative) => ({
      ...alternative,
      metricValue: metric ? metricValuesByAlternativeId[alternative.id] ?? null : null,
      metricReferences: metric ? metricReferencesByAlternativeId[alternative.id] || [] : [],
    }));
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
