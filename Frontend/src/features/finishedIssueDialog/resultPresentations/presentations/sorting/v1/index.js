import SortingDashboardResult from "./SortingDashboardResult.jsx";
import SortingFinishedIssueCardSummary from "./SortingFinishedIssueCardSummary.jsx";
import CategoryRoundedIcon from "@mui/icons-material/CategoryRounded";
import {
  buildTopsisSort2016Findings,
  isTopsisSort2016Execution,
} from "../../../modelFindings/topsis_sort_2016.js";

const ORDER_SEMANTICS = "lower-order-is-less-preferred";
const asArray = (value) => Array.isArray(value) ? value : [];
const nonEmptyString = (value) => typeof value === "string" && value.trim() ? value : null;

const unavailable = (reason) => ({ available: false, unavailableReason: reason, categories: [], assignmentCount: 0 });

const normalizeSortingDashboardResult = ({ execution, alternatives }) => {
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
  return { available: true, unavailableReason: null, categories, assignmentCount: assignedIds.size };
};

const buildSortingFindings = (result, execution) => {
  if (!result.available) return [];
  if (isTopsisSort2016Execution(execution)) return buildTopsisSort2016Findings(result, execution);

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
  normalizeDashboardResult: normalizeSortingDashboardResult,
  buildDashboardFindings: buildSortingFindings,
});

export default sortingV1ResultPresentation;
