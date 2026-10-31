import { ThemeProvider, createTheme } from "@mui/material/styles";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import DashboardView from "../../../../../src/features/finishedIssueDialog/sections/dashboard/components/DashboardView.jsx";
import SortingDashboardResult from "../../../../../src/features/finishedIssueDialog/resultPresentations/presentations/sorting/v1/SortingDashboardResult.jsx";
import { buildDashboardData } from "../../../../../src/features/finishedIssueDialog/sections/dashboard/logic/buildFinishedIssueDashboardData.js";
import {
  sortingFinalCategoryAlternativesSx,
  sortingFinalCategorySx,
  sortingFinalResultSx,
} from "../../../../../src/features/finishedIssueDialog/resultPresentations/presentations/sorting/v1/sortingResultGrid.styles.js";
import { selectFinishedIssueExecution } from "../../../../../src/features/finishedIssueDialog/logic/selectFinishedIssueExecution.js";

const alternatives = [
  { id: "mongo-a", name: "Alternative A" },
  { id: "mongo-b", name: "An alternative with a deliberately long name that should wrap on a narrow screen" },
  { id: "mongo-c", name: "Alternative C" },
];

const topsisAlternatives = [
  { id: "mongo-a", name: "Premium option" },
  { id: "mongo-b", name: "Balanced option" },
  { id: "mongo-c", name: "Budget option" },
];

const sortingExecution = (overrides = {}) => ({
  resultStructureKey: "sorting",
  resultStructureVersion: 1,
  standardizedOutput: {
    categoryOrderSemantics: "lower-order-is-less-preferred",
    categories: [
      { categoryId: "cat-low", label: "Repeated label", order: 0 },
      { categoryId: "cat-high", label: "Repeated label", order: 1 },
      { categoryId: "cat-top", label: "Preferred category", order: 2 },
    ],
    assignments: [
      { alternativeId: "mongo-a", categoryId: "cat-top" },
      { alternativeId: "mongo-b", categoryId: "cat-high" },
      { alternativeId: "mongo-c", categoryId: "cat-top" },
    ],
    diagnostics: { retained: true },
  },
  ...overrides,
});

const topsisExecution = ({ assignments, diagnostics, categories } = {}) => {
  const base = sortingExecution();
  const baseOutput = { ...base.standardizedOutput };
  delete baseOutput.diagnostics;
  return {
    ...base,
    model: { name: "TOPSIS-SORT", technical: { apiModelKey: "topsis_sort_2016" } },
    modelParameters: {
      boundaryProfiles: { profiles: [
        { profileId: "profile-medium", categoryId: "cat-medium" },
        { profileId: "profile-high", categoryId: "cat-high" },
      ] },
    },
    standardizedOutput: {
      ...baseOutput,
      categories: categories || [
        { categoryId: "cat-low", label: "Low", order: 0 },
        { categoryId: "cat-medium", label: "Medium", order: 1 },
        { categoryId: "cat-high", label: "High", order: 2 },
      ],
      assignments: assignments || [
        { alternativeId: "mongo-a", categoryId: "cat-high" },
        { alternativeId: "mongo-b", categoryId: "cat-medium" },
        { alternativeId: "mongo-c", categoryId: "cat-low" },
      ],
      ...(diagnostics === undefined ? {} : { diagnostics }),
    },
  };
};

const topsisDiagnostics = (overrides = {}) => ({
  closeness_by_alternative_id: {
    "mongo-a": 0.71,
    "mongo-b": 0.54,
    "mongo-c": 0.22,
  },
  closeness_by_profile_id: {
    "profile-medium": 0.5,
    "profile-high": 0.7,
  },
  ...overrides,
});

const topsisScenarioForCounts = (counts, labels) => {
  const categories = labels.map((label, order) => ({ categoryId: `scenario-category-${order}`, label, order }));
  const alternativesForCategories = counts.map((count, categoryOrder) => Array.from({ length: count }, (_, index) => ({
    id: `scenario-alternative-${categoryOrder}-${index}`,
    name: `Scenario option ${categoryOrder}-${index}`,
  })));
  const evaluatedAlternatives = alternativesForCategories.flat();
  const assignments = alternativesForCategories.flatMap((categoryAlternatives, categoryOrder) => categoryAlternatives.map(({ id }) => ({
    alternativeId: id,
    categoryId: categories[categoryOrder].categoryId,
  })));
  return {
    execution: topsisExecution({ categories, assignments, diagnostics: undefined }),
    alternatives: evaluatedAlternatives,
  };
};

const renderTopsisDashboard = (
  execution = topsisExecution({ diagnostics: topsisDiagnostics() }),
  evaluatedAlternatives = topsisAlternatives,
) => {
  const data = buildDashboardData({ payload: { alternatives: evaluatedAlternatives }, selectedExecution: execution });
  render(<ThemeProvider theme={createTheme()}><DashboardView data={data} /></ThemeProvider>);
  return data;
};

const renderDashboard = (execution = sortingExecution()) => {
  const data = buildDashboardData({ payload: { alternatives }, selectedExecution: execution });
  render(<ThemeProvider theme={createTheme()}><DashboardView data={data} /></ThemeProvider>);
  return data;
};

describe("sorting@1 Finished Issue presentation", () => {
  it("shows configured categories from highest to lowest preference and resolves alternatives by ID", () => {
    const data = renderDashboard();
    const result = screen.getByRole("list", { name: "Final sorting by category" });
    const categoryCards = within(result).getAllByTestId("sorting-final-category");
    expect(categoryCards).toHaveLength(3);
    expect(categoryCards[0]).toHaveAccessibleName("Preferred category: 2 alternatives");
    expect(within(categoryCards[0]).getByText("Alternative A")).toBeInTheDocument();
    expect(within(categoryCards[0]).getByText("Alternative C")).toBeInTheDocument();
    expect(within(categoryCards[0]).queryByText(/\d+ alternatives?/)).not.toBeInTheDocument();
    expect(categoryCards[1]).toHaveAccessibleName("Repeated label: 1 alternative");
    expect(within(categoryCards[1]).getByText(alternatives[1].name)).toBeInTheDocument();
    expect(categoryCards[2]).toHaveAccessibleName("Repeated label: 0 alternatives");
    expect(within(categoryCards[2]).getByText("No alternatives in this category")).toBeInTheDocument();
    expect(data.result.categories.map(({ id }) => id)).toEqual(["cat-top", "cat-high", "cat-low"]);
    expect(data.result.metric).toBe(null);
    expect(screen.queryByTestId("sorting-metric-label")).not.toBeInTheDocument();
    expect(screen.queryByText("0.7100")).not.toBeInTheDocument();
    expect(data.findings[0].items).toContain("Alternatives assigned to the highest-preference category (Preferred category): Alternative A, Alternative C.");
  });

  it("shows sorting facts without fabricated ranks, scores, or a winner", () => {
    renderDashboard();
    expect(screen.getByText("Sorting summary")).toBeInTheDocument();
    expect(screen.getByText(/3 configured categories/)).toBeInTheDocument();
    expect(screen.getByText(/3 alternatives classified/)).toBeInTheDocument();
    expect(screen.queryByText(/Recommended alternative|Score|#1|Winner/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId("EmojiEventsRoundedIcon")).not.toBeInTheDocument();
  });

  it("renders a synthetic sorting@1 model with the shared view and compatible optional metric", () => {
    const execution = topsisExecution({ diagnostics: topsisDiagnostics() });
    execution.model = { name: "Synthetic classifier", technical: { apiModelKey: "future_sorting_model" } };
    execution.modelSpecificOutput = { apiModelKey: "future_sorting_model" };
    renderTopsisDashboard(execution);

    expect(screen.getByRole("heading", { name: "Final result" })).toBeInTheDocument();
    expect(screen.getByTestId("sorting-final-result")).toBeInTheDocument();
    expect(screen.getAllByTestId("sorting-final-category")).toHaveLength(3);
    expect(screen.getByText("0.7100")).toBeInTheDocument();
    expect(screen.getAllByTestId("sorting-metric-point")[0]).toHaveAttribute("data-metric-value", "0.71");
    expect(screen.getByText("Sorting summary")).toBeInTheDocument();
    expect(screen.queryByTestId("topsis-sort-category-list")).not.toBeInTheDocument();
    expect(screen.queryByText(/ranking|winner/i)).not.toBeInTheDocument();
  });

  it("renders future Sorting metrics from declared metadata without inventing a scale or order", () => {
    const result = {
      categories: [{
        id: "category-a",
        label: "A very long category name that should remain readable on a narrow screen",
        order: 0,
        metricRange: null,
        alternatives: [
          { id: "alternative-first", name: "Configured first", metricValue: 0.72 },
          { id: "alternative-second", name: "Configured second", metricValue: 0.31 },
        ],
      }],
      metric: {
        key: "globalPriority",
        label: "Global AHP priority",
        minimum: 0,
        maximum: 1,
        precision: 4,
        comparableAcrossAlternatives: false,
        visualization: "value-only",
        ordering: "preserve",
      },
    };

    render(<ThemeProvider theme={createTheme()}><SortingDashboardResult result={result} /></ThemeProvider>);

    const category = screen.getByRole("listitem", { name: /A very long category name/ });
    expect(within(category).getAllByTestId("sorting-metric-value").map((value) => value.textContent)).toEqual(["0.7200", "0.3100"]);
    expect(within(category).getAllByRole("listitem").map((row) => row.querySelector("p")?.textContent)).toEqual([
      "Configured first",
      "Configured second",
    ]);
    expect(within(category).queryByTestId("sorting-metric-scale")).not.toBeInTheDocument();
  });

  it("renders contextual metrics on each alternative's own references and preserves configured order", () => {
    const result = {
      categories: [{
        id: "category-a",
        label: "A category",
        order: 0,
        metricRange: null,
        alternatives: [
          {
            id: "alternative-first",
            name: "Configured first",
            metricValue: 0.72,
            metricReferences: [{ id: "profile-first", label: "First profile", value: 0.81 }],
          },
          {
            id: "alternative-second",
            name: "Configured second",
            metricValue: 0.31,
            metricReferences: [
              { id: "profile-second-low", label: "Second low profile", value: 0.25 },
              { id: "profile-second-high", label: "Second high profile", value: 0.9 },
            ],
          },
        ],
      }],
      metric: {
        key: "contextualPriority",
        label: "Contextual priority",
        minimum: 0,
        maximum: 1,
        precision: 4,
        comparableAcrossAlternatives: false,
        visualization: "contextual-reference",
        referenceScope: "alternative",
        ordering: "preserve",
      },
    };

    render(<ThemeProvider theme={createTheme()}><SortingDashboardResult result={result} /></ThemeProvider>);

    const category = screen.getByRole("listitem", { name: /A category/ });
    expect(within(category).getAllByRole("listitem").map((row) => row.querySelector("p")?.textContent)).toEqual([
      "Configured first",
      "Configured second",
    ]);
    expect(within(category).getAllByTestId("sorting-metric-value").map((value) => value.textContent)).toEqual(["0.7200", "0.3100"]);
    expect(within(category).getAllByTestId("sorting-metric-scale")).toHaveLength(2);
    expect(within(category).getAllByTestId("sorting-metric-point").map((point) => point.style.left)).toEqual(["72%", "31%"]);
    expect(within(category).getAllByTestId("sorting-metric-reference").map((reference) => reference.style.left)).toEqual(["81%", "25%", "90%"]);
    expect(within(category).getAllByTestId("sorting-metric-scale")[0]).toHaveAttribute("data-domain-minimum", "0");
    expect(within(category).getAllByTestId("sorting-metric-scale")[0]).toHaveAttribute("data-domain-maximum", "1");
  });

  it("keeps a contextual metric value when an alternative has no reliable references", () => {
    const result = {
      categories: [{
        id: "category-a",
        label: "A category",
        order: 0,
        metricRange: null,
        alternatives: [{ id: "alternative-a", name: "Alternative A", metricValue: 0.42 }],
      }],
      metric: {
        key: "contextualPriority",
        label: "Contextual priority",
        minimum: 0,
        maximum: 1,
        precision: 4,
        comparableAcrossAlternatives: false,
        visualization: "contextual-reference",
        referenceScope: "alternative",
        ordering: "preserve",
      },
    };

    render(<ThemeProvider theme={createTheme()}><SortingDashboardResult result={result} /></ThemeProvider>);

    expect(screen.getByTestId("sorting-metric-value")).toHaveTextContent("0.4200");
    expect(screen.queryByTestId("sorting-metric-scale")).not.toBeInTheDocument();
  });

  it("renders a generic continuous classification that grows within Finished Issue", () => {
    expect(sortingFinalResultSx).toMatchObject({
      display: "flex",
      flexDirection: "column",
      overflowX: "hidden",
    });
    expect(sortingFinalResultSx).not.toHaveProperty("maxHeight");
    expect(sortingFinalResultSx).not.toHaveProperty("overflowY");
    expect(sortingFinalCategorySx).toMatchObject({
      display: "grid",
      gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "minmax(190px, 0.34fr) minmax(0, 1fr)" },
      columnGap: { xs: 0, md: 2 },
    });
    expect(sortingFinalCategorySx).not.toHaveProperty("height");
    expect(sortingFinalCategorySx).not.toHaveProperty("borderRadius");
    expect(sortingFinalCategorySx).not.toHaveProperty("bgcolor");
    expect(sortingFinalCategoryAlternativesSx).toMatchObject({
      position: "relative",
      "&::before": {
        position: "absolute",
        width: "1px",
        color: "secondary.light",
      },
    });
    expect(sortingFinalCategoryAlternativesSx).not.toHaveProperty("borderLeft");
    expect(sortingFinalCategoryAlternativesSx).not.toHaveProperty("maxHeight");
    expect(sortingFinalCategoryAlternativesSx).not.toHaveProperty("overflowY");

    renderTopsisDashboard();
    const category = screen.getByRole("listitem", { name: "High: 1 alternative", exact: true });
    const header = within(category).getByText("High");
    const body = within(category).getByTestId("sorting-final-category-body");
    expect(header).toHaveTextContent("High");
    expect(header.compareDocumentPosition(body) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(body).toContainElement(within(category).getByText("Premium option"));
    expect(screen.getByTestId("sorting-final-result")).toContainElement(body);
  });

  it.each([
    ["unknown alternative ID", { assignments: [{ alternativeId: "unknown", categoryId: "cat-top" }] }],
    ["missing assignment", { assignments: [{ alternativeId: "mongo-a", categoryId: "cat-top" }] }],
    ["unknown category ID", { assignments: [{ alternativeId: "mongo-a", categoryId: "unknown" }, { alternativeId: "mongo-b", categoryId: "cat-high" }, { alternativeId: "mongo-c", categoryId: "cat-top" }] }],
  ])("does not render incomplete sorting data as valid when it has an %s", (_label, outputOverrides) => {
    const data = renderDashboard({
      ...sortingExecution(),
      standardizedOutput: { ...sortingExecution().standardizedOutput, ...outputOverrides },
    });
    expect(data.result.available).toBe(false);
    expect(screen.getByText(/stored sorting/i)).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Final sorting by category" })).not.toBeInTheDocument();
  });

  it("shows an explicit unavailable state for unsupported or partial result metadata", () => {
    const unsupported = renderDashboard({ ...sortingExecution(), resultStructureKey: "sorting", resultStructureVersion: 2 });
    expect(unsupported.result.available).toBe(false);
    expect(screen.getByText("Result presentation for sorting@2 is not available.")).toBeInTheDocument();
  });

  it("shows model-specific classification findings and maps persisted diagnostics by ID", () => {
    const data = renderTopsisDashboard();
    expect(data.findings.map(({ title }) => title)).toEqual([
      "Most favorable classification",
      "Closest category boundary",
      "Lowest assigned category",
    ]);
    expect(data.findings[0]).toMatchObject({ headline: "High" });
    expect(data.findings[0].text).toBe("Premium option received the most favorable classification in this evaluation, placing it in the High category.");
    expect(data.findings[1]).toMatchObject({ headline: "Medium / High" });
    expect(data.findings[1].text).toBe("Among the evaluated alternatives, Premium option was classified as High and is closest to the dividing line between Medium and High.");
    expect(data.findings[2]).toMatchObject({ headline: "Low" });
    expect(data.findings[2].text).toBe("Low is the lowest configured category and contains 1 alternative.");
    expect(screen.getByText("Premium option")).toBeInTheDocument();
    expect(screen.getByText("Balanced option")).toBeInTheDocument();
    expect(screen.getByText("Budget option")).toBeInTheDocument();
    expect(screen.queryByText(/position|rank|score|winner/i)).not.toBeInTheDocument();
    expect(data.findings.flatMap(({ title, text }) => `${title} ${text}`).join(" ")).not.toMatch(/0\.01|closeness|distance|uncertainty|sensitivity/i);
  });

  it("describes the lowest assigned Tehran category and the configured categories below it", () => {
    const scenario = topsisScenarioForCounts(
      [0, 0, 11, 9, 2],
      ["Very low suitable", "Low suitable", "Moderately suitable", "Suitable", "High suitable"],
    );
    const data = renderTopsisDashboard(scenario.execution, scenario.alternatives);
    const leastFinding = data.findings.at(-1);

    expect(data.result.categories.map(({ label, alternatives: assigned }) => [label, assigned.length])).toEqual([
      ["High suitable", 2],
      ["Suitable", 9],
      ["Moderately suitable", 11],
      ["Low suitable", 0],
      ["Very low suitable", 0],
    ]);
    expect(leastFinding).toMatchObject({
      kind: "least_favorable_classification",
      title: "Lowest assigned category",
      headline: "Moderately suitable",
      text: "Moderately suitable is the lowest category containing evaluated alternatives, with 11 alternatives assigned. No alternatives were assigned to the Low suitable and Very low suitable categories.",
    });
    expect(leastFinding.text).not.toMatch(/Scenario option|and others|district/i);
  });

  it("describes an occupied lowest configured category using its actual count", () => {
    const scenario = topsisScenarioForCounts([4, 3, 2], ["Low", "Medium", "High"]);
    const data = renderTopsisDashboard(scenario.execution, scenario.alternatives);

    expect(data.findings.at(-1)).toMatchObject({
      title: "Lowest assigned category",
      headline: "Low",
      text: "Low is the lowest configured category and contains 4 alternatives.",
    });
  });

  it("uses singular grammar when one alternative is assigned to the lowest category", () => {
    const scenario = topsisScenarioForCounts([1, 3, 2], ["Low", "Medium", "High"]);
    const data = renderTopsisDashboard(scenario.execution, scenario.alternatives);

    expect(data.findings.at(-1).text).toBe("Low is the lowest configured category and contains 1 alternative.");
  });

  it("mentions a small set of empty lower categories by their configured names", () => {
    const scenario = topsisScenarioForCounts([0, 2, 1], ["Very low", "Low", "High"]);
    const data = renderTopsisDashboard(scenario.execution, scenario.alternatives);

    expect(data.findings.at(-1).text).toBe("Low is the lowest category containing evaluated alternatives, with 2 alternatives assigned. No alternatives were assigned to the Very low category.");
  });

  it("summarizes many empty lower categories without a long list", () => {
    const labels = ["Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8"];
    const scenario = topsisScenarioForCounts([0, 0, 0, 0, 0, 0, 2, 1], labels);
    const data = renderTopsisDashboard(scenario.execution, scenario.alternatives);
    const text = data.findings.at(-1).text;

    expect(text).toBe("Class 7 is the lowest category containing evaluated alternatives, with 2 alternatives assigned. No alternatives were assigned to any of the 6 lower categories.");
    expect(text).not.toContain("Class 1");
    expect(text).not.toContain("Class 6");
    expect(text).not.toContain("Scenario option");
  });

  it("counts empty lower categories by ID when their visible names are duplicated", () => {
    const scenario = topsisScenarioForCounts([0, 0, 1, 3], ["Low", "Unassigned", "Low", "High"]);
    const data = renderTopsisDashboard(scenario.execution, scenario.alternatives);

    expect(data.findings.at(-1).text).toBe("Low is the lowest category containing an alternative, with 1 alternative assigned. No alternatives were assigned to any of the 2 lower categories.");
  });

  it("keeps the all-alternatives-in-one-category finding and handles one configured category", () => {
    const oneCategoryScenario = topsisScenarioForCounts([2], ["Single class"]);
    const data = renderTopsisDashboard(oneCategoryScenario.execution, oneCategoryScenario.alternatives);

    expect(data.findings).toHaveLength(1);
    expect(data.findings[0]).toMatchObject({
      title: "Most favorable classification",
      text: "All evaluated alternatives share the Single class category, so this evaluation does not establish category differences among them.",
    });

    const emptyScenario = topsisScenarioForCounts([0], ["Single class"]);
    const emptyData = renderTopsisDashboard(emptyScenario.execution, emptyScenario.alternatives);
    expect(emptyData.findings).toEqual([]);
  });

  it("shows position scales on a common 0-to-1 range without technical interval labels", () => {
    const execution = topsisExecution({
      diagnostics: topsisDiagnostics({
        closeness_by_alternative_id: { "mongo-a": 0.51, "mongo-b": 0.6, "mongo-c": 0.69 },
      }),
      assignments: topsisAlternatives.map(({ id }) => ({ alternativeId: id, categoryId: "cat-medium" })),
    });
    const data = renderTopsisDashboard(execution);
    const category = screen.getByRole("listitem", { name: "Medium: 3 alternatives", exact: true });
    const rows = within(category).getAllByRole("listitem");

    expect(data.result.metric).toMatchObject({
      key: "relativeCloseness",
      label: "Relative closeness",
      minimum: 0,
      maximum: 1,
      comparableAcrossAlternatives: true,
      visualization: "bounded-position",
      ordering: "descending-within-category",
    });
    expect(rows.map((row) => row.getAttribute("aria-label"))).toEqual([
      "Budget option, Relative closeness 0.6900",
      "Balanced option, Relative closeness 0.6000",
      "Premium option, Relative closeness 0.5100",
    ]);
    const scales = within(category).getAllByTestId("sorting-metric-scale");
    expect(scales).toHaveLength(3);
    expect(within(category).queryByTestId("sorting-metric-interval")).not.toBeInTheDocument();
    expect(within(category).queryByText(/Closeness\s*[<>]/)).not.toBeInTheDocument();
    expect(within(category).getAllByTestId("sorting-metric-point")[0]).toHaveStyle({ left: "69%" });
    expect(within(category).getAllByTestId("sorting-metric-point")[1]).toHaveStyle({ left: "60%" });
    expect(within(category).getAllByTestId("sorting-metric-reference").map((marker) => marker.getAttribute("data-reference-value"))).toEqual([
      "0.5", "0.7", "0.5", "0.7", "0.5", "0.7",
    ]);
    expect(within(category).getByText("0.6900")).toBeInTheDocument();
    expect(within(category).queryByTestId("sorting-relative-closeness-fill")).not.toBeInTheDocument();
    expect(within(category).queryByText(/Closer to|Centered in this category/)).not.toBeInTheDocument();
    expect(within(category).queryByRole("img")).not.toBeInTheDocument();
    expect(screen.queryByText(/rank/i)).not.toBeInTheDocument();
    expect(screen.getAllByText("No alternatives in this category")).toHaveLength(2);
    expect(screen.getAllByTestId("sorting-final-empty-category-icon")).toHaveLength(2);
    expect(data.result.categories.find(({ label }) => label === "Medium").metricRange).toEqual({ lower: 0.5, upper: 0.7 });
  });

  it("keeps full-precision boundary evidence and positions markers without showing interval labels", () => {
    const execution = topsisExecution({
      diagnostics: topsisDiagnostics({
        closeness_by_alternative_id: { "mongo-a": 0.71, "mongo-b": 0.60006, "mongo-c": 0.22 },
        closeness_by_profile_id: { "profile-medium": 0.50006, "profile-high": 0.70006 },
      }),
    });
    const data = renderTopsisDashboard(execution);
    const category = screen.getByRole("listitem", { name: "Medium: 1 alternative", exact: true });
    const categoryData = data.result.categories.find(({ id }) => id === "cat-medium");

    expect(within(category).queryByTestId("sorting-metric-interval")).not.toBeInTheDocument();
    expect(within(category).queryByText(/Closeness\s*[<>]/)).not.toBeInTheDocument();
    expect(categoryData.metricRange).toEqual({ lower: 0.50006, upper: 0.70006 });
    expect(categoryData.alternatives.find(({ id }) => id === "mongo-b").metricValue).toBe(0.60006);
    expect(within(category).getByTestId("sorting-metric-point")).toHaveStyle({ left: "60.006%" });
    expect(within(category).getAllByTestId("sorting-metric-reference").map((marker) => marker.style.left)).toEqual([
      "50.006%", "70.006%",
    ]);
    expect(within(category).getByText("0.6001")).toBeInTheDocument();
  });

  it("uses only existing adjacent boundaries for the lowest and highest categories", () => {
    const alternativesAtExtremes = [
      ...topsisAlternatives,
      { id: "mongo-d", name: "Top category option" },
    ];
    renderTopsisDashboard(topsisExecution({
      diagnostics: topsisDiagnostics({
        closeness_by_alternative_id: {
          "mongo-a": 0.1,
          "mongo-b": 0.35,
          "mongo-c": 0.71,
          "mongo-d": 0.95,
        },
      }),
      assignments: [
        { alternativeId: "mongo-a", categoryId: "cat-low" },
        { alternativeId: "mongo-b", categoryId: "cat-low" },
        { alternativeId: "mongo-c", categoryId: "cat-high" },
        { alternativeId: "mongo-d", categoryId: "cat-high" },
      ],
    }), alternativesAtExtremes);
    const lowest = screen.getByRole("listitem", { name: "Low: 2 alternatives", exact: true });
    const highest = screen.getByRole("listitem", { name: "High: 2 alternatives", exact: true });

    expect(within(lowest).getAllByRole("listitem").map((row) => row.getAttribute("aria-label"))).toEqual([
      "Balanced option, Relative closeness 0.3500",
      "Premium option, Relative closeness 0.1000",
    ]);
    expect(within(lowest).getAllByTestId("sorting-metric-point").map((point) => point.style.left)).toEqual(["35%", "10%"]);
    expect(within(highest).getAllByTestId("sorting-metric-point").map((point) => point.style.left)).toEqual(["95%", "71%"]);
    expect(within(lowest).getAllByTestId("sorting-metric-reference").map((marker) => marker.getAttribute("data-reference-value"))).toEqual(["0.5", "0.5"]);
    expect(within(highest).getAllByTestId("sorting-metric-reference").map((marker) => marker.getAttribute("data-reference-value"))).toEqual(["0.7", "0.7"]);
    expect(within(lowest).queryByTestId("sorting-metric-interval")).not.toBeInTheDocument();
    expect(within(highest).queryByTestId("sorting-metric-interval")).not.toBeInTheDocument();
    expect(screen.queryByText(/Closeness\s*[<>]/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Closer to|Centered in this category|Position within category/)).not.toBeInTheDocument();
  });

  it("renders invalid or missing closeness as name-only rows and keeps tie order stable", () => {
    const alternativesWithInvalidData = [...topsisAlternatives, { id: "mongo-d", name: "Out-of-range alternative" }];
    renderTopsisDashboard(topsisExecution({
      diagnostics: topsisDiagnostics({
        closeness_by_alternative_id: { "mongo-a": 0.6, "mongo-b": 0.6, "mongo-c": "0.9", "mongo-d": 1.2 },
      }),
      assignments: [
        { alternativeId: "mongo-b", categoryId: "cat-medium" },
        { alternativeId: "mongo-a", categoryId: "cat-medium" },
        { alternativeId: "mongo-c", categoryId: "cat-medium" },
        { alternativeId: "mongo-d", categoryId: "cat-medium" },
      ],
    }), alternativesWithInvalidData);
    const category = screen.getByRole("listitem", { name: "Medium: 4 alternatives", exact: true });
    const rows = within(category).getAllByRole("listitem");

    expect(rows.map((row) => row.getAttribute("aria-label"))).toEqual([
      "Balanced option, Relative closeness 0.6000",
      "Premium option, Relative closeness 0.6000",
      "Budget option",
      "Out-of-range alternative",
    ]);
    expect(within(category).getAllByTestId("sorting-metric-point")).toHaveLength(2);
    expect(within(category).getByText("Budget option")).toBeInTheDocument();
    expect(within(category).queryByText("0.9000")).not.toBeInTheDocument();
  });

  it("keeps empty categories compact and scrolls only the complete classification", () => {
    const manyAlternatives = Array.from({ length: 14 }, (_, index) => ({
      id: `many-${index}`,
      name: index === 0 ? "A deliberately long alternative name that still fits its category row" : `Alternative ${index + 1}`,
    }));
    const execution = topsisExecution({
      assignments: manyAlternatives.map(({ id }) => ({ alternativeId: id, categoryId: "cat-medium" })),
      diagnostics: topsisDiagnostics({
        closeness_by_alternative_id: Object.fromEntries(manyAlternatives.map(({ id }, index) => [id, 0.51 + index * 0.01])),
      }),
    });
    const data = renderTopsisDashboard(execution, manyAlternatives);

    const empty = screen.getByRole("listitem", { name: "High: 0 alternatives", exact: true });
    expect(within(empty).getByText("No alternatives in this category", { exact: true })).toBeInTheDocument();
    expect(within(empty).getByTestId("sorting-final-empty-category-icon")).toHaveAttribute("aria-hidden", "true");
    expect(within(empty).getByTestId("sorting-final-empty-category")).toHaveAccessibleName("No alternatives in this category");
    expect(within(empty).queryByTestId("sorting-metric-point")).not.toBeInTheDocument();
    const populated = screen.getByRole("listitem", { name: "Medium: 14 alternatives", exact: true });
    expect(within(populated).getByTestId("sorting-final-category-body")).not.toHaveStyle({ overflowY: "auto" });
    expect(within(populated).getByTestId("sorting-final-category-body")).not.toHaveStyle({ maxHeight: "280px" });
    expect(screen.getByTestId("sorting-final-result")).not.toHaveStyle({ overflowY: "auto" });
    expect(screen.getByTestId("sorting-final-result")).not.toHaveStyle({ maxHeight: "440px" });
    expect(within(populated).getAllByRole("listitem")).toHaveLength(14);
    expect(within(populated).getByText(manyAlternatives[0].name)).toBeInTheDocument();
    expect(data.result.categories.map(({ label }) => label)).toEqual(["High", "Medium", "Low"]);
  });

  it.each([
    [1, ["Single named class"]],
    [2, ["High tier", "Low tier"]],
    [5, ["Preferred", "Repeated", "Repeated", "Lower", "Least preferred"]],
  ])("preserves configured category names and vertical order with %i categories", (count, labels) => {
    const categories = labels.map((label, index) => ({ categoryId: `category-${index}`, label, order: index }));
    const execution = topsisExecution({ categories, assignments: [] });
    const data = renderTopsisDashboard(execution, []);
    const renderedCategories = within(screen.getByTestId("sorting-final-result")).getAllByTestId("sorting-final-category");

    expect(renderedCategories).toHaveLength(count);
    expect([...labels].reverse().every((label, index) => within(renderedCategories[index]).getByText(label))).toBe(true);
    expect(data.result.categories.map(({ label }) => label)).toEqual([...labels].reverse());
    expect(screen.queryAllByText("Repeated")).toHaveLength(labels.filter((label) => label === "Repeated").length);
    expect(screen.queryByText(/category-\d|cat-(?:low|medium|high)|profile-/i)).not.toBeInTheDocument();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("keeps long category and alternative names intact without exposing internal IDs", () => {
    const longCategory = "Most favorable classification for the long-term regional investment alternatives";
    const longAlternative = "A supplier alternative with a deliberately long public display name";
    const evaluatedAlternatives = [
      { id: "mongo-a", name: longAlternative },
      { id: "mongo-b", name: "Balanced option" },
      { id: "mongo-c", name: "Budget option" },
    ];
    const data = renderTopsisDashboard(topsisExecution({
      categories: [
        { categoryId: "custom-high-id", label: longCategory, order: 2 },
        { categoryId: "custom-middle-id", label: "Repeated label", order: 1 },
        { categoryId: "custom-low-id", label: "Repeated label", order: 0 },
      ],
      assignments: [
        { alternativeId: "mongo-a", categoryId: "custom-high-id" },
        { alternativeId: "mongo-b", categoryId: "custom-middle-id" },
        { alternativeId: "mongo-c", categoryId: "custom-low-id" },
      ],
    }), evaluatedAlternatives);

    expect(data.result.categories.map(({ label }) => label)).toEqual([longCategory, "Repeated label", "Repeated label"]);
    const renderedCategories = screen.getByTestId("sorting-final-result");
    const longCategoryGroup = screen.getByRole("listitem", { name: `${longCategory}: 1 alternative`, exact: true });
    expect(within(longCategoryGroup).getByText(longCategory)).toBeInTheDocument();
    expect(within(longCategoryGroup).getByText(longAlternative)).toBeInTheDocument();
    expect(within(renderedCategories).getAllByText("Repeated label")).toHaveLength(2);
    expect(within(renderedCategories).queryByText(/custom-(?:high|middle|low)-id|mongo-[abc]|profile-/i)).not.toBeInTheDocument();
  });

  it("keeps closeness points and hides unsupported boundaries when boundary evidence is unavailable", () => {
    const data = renderTopsisDashboard(topsisExecution({
      diagnostics: topsisDiagnostics({ closeness_by_profile_id: { "profile-medium": 0.7, "profile-high": 0.5 } }),
      assignments: topsisAlternatives.map(({ id }) => ({ alternativeId: id, categoryId: "cat-medium" })),
    }));
    const category = screen.getByRole("listitem", { name: "Medium: 3 alternatives", exact: true });
    const rows = within(category).getAllByRole("listitem");

    expect(rows.map((row) => row.getAttribute("aria-label"))).toEqual([
      "Premium option, Relative closeness 0.7100",
      "Balanced option, Relative closeness 0.5400",
      "Budget option, Relative closeness 0.2200",
    ]);
    expect(within(category).getAllByTestId("sorting-metric-point")).toHaveLength(3);
    expect(within(category).queryByTestId("sorting-metric-reference")).not.toBeInTheDocument();
    expect(within(category).queryByTestId("sorting-metric-interval")).not.toBeInTheDocument();
    expect(within(category).queryByText(/Closer to|Centered in this category/)).not.toBeInTheDocument();
    expect(data.result.categories).toHaveLength(3);
  });

  it("uses the highest and lowest non-empty categories when an extreme category is empty", () => {
    const data = renderTopsisDashboard(topsisExecution({
      diagnostics: topsisDiagnostics({
        closeness_by_alternative_id: { "mongo-a": 0.54, "mongo-b": 0.3, "mongo-c": 0.22 },
      }),
      assignments: [
        { alternativeId: "mongo-a", categoryId: "cat-medium" },
        { alternativeId: "mongo-b", categoryId: "cat-low" },
        { alternativeId: "mongo-c", categoryId: "cat-low" },
      ],
    }));
    expect(data.result.categories[0].label).toBe("High");
    expect(data.result.categories[0].alternatives).toHaveLength(0);
    expect(data.findings[0]).toMatchObject({ headline: "Medium" });
    expect(data.findings[0].text).toContain("Premium option received the most favorable classification");
    expect(data.findings[2]).toMatchObject({ headline: "Low" });
    expect(data.findings[2].text).toBe("Low is the lowest configured category and contains 2 alternatives.");
  });

  it("uses one finding when every alternative shares one category", () => {
    const data = renderTopsisDashboard(topsisExecution({
      diagnostics: topsisDiagnostics(),
      assignments: topsisAlternatives.map(({ id }) => ({ alternativeId: id, categoryId: "cat-medium" })),
    }));
    expect(data.findings).toHaveLength(1);
    expect(data.findings[0].text).toBe("All evaluated alternatives share the Medium category, so this evaluation does not establish category differences among them.");
  });

  it.each([
    ["missing diagnostics", undefined],
    ["malformed alternative closeness", { closeness_by_alternative_id: { "mongo-a": 0.4 }, closeness_by_profile_id: { "profile-medium": 0.5, "profile-high": 0.7 } }],
    ["non-finite profile closeness", { closeness_by_alternative_id: { "mongo-a": 0.71, "mongo-b": 0.54, "mongo-c": 0.22 }, closeness_by_profile_id: { "profile-medium": Number.NaN, "profile-high": 0.7 } }],
    ["missing profile configuration", topsisDiagnostics(), true],
    ["non-increasing profile coefficients", topsisDiagnostics({ closeness_by_profile_id: { "profile-medium": 0.7, "profile-high": 0.5 } })],
    ["persisted category inconsistent with its interval", topsisDiagnostics({ closeness_by_alternative_id: { "mongo-a": 0.6, "mongo-b": 0.54, "mongo-c": 0.22 } })],
    ["alternative exactly on a profile boundary", topsisDiagnostics({ closeness_by_alternative_id: { "mongo-a": 0.71, "mongo-b": 0.5, "mongo-c": 0.22 } })],
    ["out-of-range coefficient", topsisDiagnostics({ closeness_by_profile_id: { "profile-medium": 0.5, "profile-high": 1.01 } })],
  ])("falls back to category evidence for %s", (_label, diagnostics, missingProfiles = false) => {
    const execution = topsisExecution({ diagnostics });
    if (missingProfiles) execution.modelParameters.boundaryProfiles.profiles = [];
    const data = renderTopsisDashboard(execution);
    expect(data.findings.map(({ title }) => title)).toEqual([
      "Most favorable classification",
      "Lowest assigned category",
    ]);
    expect(data.findings[0].text).toContain("received the most favorable classification");
    expect(data.findings[1].text).toContain("is the lowest configured category");
    expect(data.findings.some(({ title }) => title === "Closest category boundary")).toBe(false);
  });

  it("describes multiple alternatives tied at distinct category boundaries naturally", () => {
    const data = renderTopsisDashboard(topsisExecution({
      diagnostics: {
        closeness_by_alternative_id: { "mongo-a": 0.8, "mongo-b": 0.5, "mongo-c": 0.1 },
        closeness_by_profile_id: { "profile-medium": 0.4, "profile-high": 0.7 },
      },
    }));
    expect(data.findings[1].text).toContain("Premium option, classified as High, is closest to the dividing line between Medium and High");
    expect(data.findings[1].text).toContain("Balanced option, classified as Medium, is closest to the dividing line between Low and Medium");
    expect(data.findings[1].text).toContain("These alternatives share the closest proximity");
    expect(data.findings[1].text).not.toMatch(/\d\.\d{3,}|closeness difference|uncertainty|sensitivity/i);
  });

  it("describes one alternative tied between multiple boundaries without listing every pair", () => {
    const data = renderTopsisDashboard(topsisExecution({
      diagnostics: {
        closeness_by_alternative_id: { "mongo-a": 0.8, "mongo-b": 0.5, "mongo-c": 0.1 },
        closeness_by_profile_id: { "profile-medium": 0.4, "profile-high": 0.6 },
      },
    }));
    expect(data.findings[1].text).toContain("Balanced option was classified as Medium");
    expect(data.findings[1].text).toContain("equally close");
    expect(data.findings[1].text).toContain("dividing line between Low and Medium");
    expect(data.findings[1].text).toContain("dividing line between Medium and High");
    expect(data.findings[1].text).not.toMatch(/\d\.\d{3,}|closeness difference|uncertainty|sensitivity/i);
  });

  it("keeps meaningfully different boundary distances distinct", () => {
    const data = renderTopsisDashboard(topsisExecution({
      diagnostics: {
        closeness_by_alternative_id: { "mongo-a": 0.8, "mongo-b": 0.5, "mongo-c": 0.300001 },
        closeness_by_profile_id: { "profile-medium": 0.4, "profile-high": 0.7 },
      },
    }));
    expect(data.findings[1].text).toContain("Budget option was classified as Low and is closest");
    expect(data.findings[1].text).not.toContain("Premium option");
    expect(data.findings[1].text).not.toContain("Balanced option");
  });

  it("summarizes large shared classifications without an alternative count", () => {
    const manyAlternatives = Array.from({ length: 6 }, (_, index) => ({
      id: `alt-${index}`,
      name: index < 3 ? `Long premium alternative name ${index + 1}` : `Extra option ${index + 1}`,
    }));
    const execution = topsisExecution({
      assignments: manyAlternatives.map(({ id }, index) => ({
        alternativeId: id,
        categoryId: index < 4 ? "cat-high" : "cat-low",
      })),
      diagnostics: {
        closeness_by_alternative_id: Object.fromEntries(manyAlternatives.map(({ id }, index) => [
          id,
          index < 4 ? 0.8 + index * 0.01 : 0.35 - (index - 4) * 0.1,
        ])),
        closeness_by_profile_id: { "profile-medium": 0.5, "profile-high": 0.7 },
      },
    });
    const data = renderTopsisDashboard(execution, manyAlternatives);
    expect(data.findings[0].text).toBe("Long premium alternative name 1, Long premium alternative name 2, Long premium alternative name 3, and others received the most favorable classification in this evaluation, placing them in the High category.");
    expect(data.findings[0].text).not.toMatch(/\d+ alternatives? (assigned|classified)/i);
  });

  it("uses persisted model identity for base Issues and scenario executions", () => {
    const output = topsisExecution({ diagnostics: topsisDiagnostics() }).standardizedOutput;
    const modelParameters = topsisExecution().modelParameters;
    const basePayload = {
      alternatives: topsisAlternatives,
      models: { base: { name: "TOPSIS-SORT", technical: { apiModelKey: "topsis_sort_2016" }, effectiveParameters: modelParameters } },
      phaseResults: [{
        stage: "alternativeEvaluation", phase: 0, standardizedOutput: output,
        resultStructureKey: "sorting", resultStructureVersion: 1,
        modelSpecificOutput: { apiModelKey: "topsis_sort_2016" },
      }],
    };
    const baseExecution = selectFinishedIssueExecution(basePayload);
    const baseDashboard = buildDashboardData({ payload: basePayload, selectedExecution: baseExecution });
    expect(baseDashboard.findings).toHaveLength(3);
    expect(baseDashboard.result.categories.find(({ id }) => id === "cat-medium").metricRange).toEqual({ lower: 0.5, upper: 0.7 });

    const scenarioOutput = {
      ...output,
      assignments: [
        { alternativeId: "mongo-a", categoryId: "cat-high" },
        { alternativeId: "mongo-b", categoryId: "cat-medium" },
        { alternativeId: "mongo-c", categoryId: "cat-medium" },
      ],
      diagnostics: {
        closeness_by_alternative_id: { "mongo-a": 0.8, "mongo-b": 0.6, "mongo-c": 0.49 },
        closeness_by_profile_id: { "profile-medium": 0.48, "profile-high": 0.75 },
      },
    };

    const scenarioPayload = {
      alternatives: topsisAlternatives,
      models: { base: { name: "Other model" }, compatible: [{ id: "model-1", name: "TOPSIS-SORT" }] },
      scenarios: [{
        id: "scenario-1", name: "TOPSIS-SORT scenario",
        targetModel: { id: "model-1", name: "TOPSIS-SORT" },
        phaseResults: [{
          phase: 0, standardizedOutput: scenarioOutput,
          resultStructureKey: "sorting", resultStructureVersion: 1,
          modelSpecificOutput: { apiModelKey: "topsis_sort_2016" },
          requestSnapshot: { modelParameters },
        }],
      }],
    };
    const scenarioExecution = selectFinishedIssueExecution(scenarioPayload, "scenario-1");
    expect(scenarioExecution.model.technical?.apiModelKey).toBeUndefined();
    expect(scenarioExecution.modelSpecificOutput.apiModelKey).toBe("topsis_sort_2016");
    const scenarioDashboard = buildDashboardData({ payload: scenarioPayload, selectedExecution: scenarioExecution });
    expect(scenarioDashboard.findings).toHaveLength(3);
    expect(baseDashboard.findings.at(-1).text).toBe("Low is the lowest configured category and contains 1 alternative.");
    expect(scenarioDashboard.findings.at(-1)).toMatchObject({
      title: "Lowest assigned category",
      headline: "Medium",
      text: "Medium is the lowest category containing evaluated alternatives, with 2 alternatives assigned. No alternatives were assigned to the Low category.",
    });
    expect(scenarioDashboard.result.categories.find(({ id }) => id === "cat-medium").metricRange).toEqual({ lower: 0.48, upper: 0.75 });
    expect(scenarioDashboard.result.categories.find(({ id }) => id === "cat-medium").alternatives.find(({ id }) => id === "mongo-b").metricValue).toBe(0.6);
  });

  it("does not identify TOPSIS-Sort by its visible name", () => {
    const execution = {
      ...topsisExecution({ diagnostics: topsisDiagnostics() }),
      model: { name: "TOPSIS-SORT", technical: { apiModelKey: "another_model" } },
      modelSpecificOutput: { apiModelKey: "another_model" },
    };
    const data = buildDashboardData({ payload: { alternatives: topsisAlternatives }, selectedExecution: execution });
    expect(data.findings).toEqual(expect.arrayContaining([expect.objectContaining({ title: "Sorting summary" })]));
    expect(data.findings.some(({ title }) => title === "Closest category boundary")).toBe(false);
  });
});
