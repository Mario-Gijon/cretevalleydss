import { ThemeProvider, createTheme } from "@mui/material/styles";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import DashboardView from "../../../../../src/features/finishedIssueDialog/sections/dashboard/components/DashboardView.jsx";
import { buildDashboardData } from "../../../../../src/features/finishedIssueDialog/sections/dashboard/logic/buildFinishedIssueDashboardData.js";
import {
  sortingResultGridSx,
  topsisSortCategoryBodySx,
  topsisSortCategoryCardSx,
  topsisSortResultGridSx,
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
    const categoryCards = within(result).getAllByRole("listitem").filter((element) => element.hasAttribute("aria-label"));
    expect(categoryCards).toHaveLength(3);
    expect(categoryCards[0]).toHaveAccessibleName("Preferred category: 2 alternatives");
    expect(within(categoryCards[0]).getByText("Alternative A")).toBeInTheDocument();
    expect(within(categoryCards[0]).getByText("Alternative C")).toBeInTheDocument();
    expect(categoryCards[1]).toHaveAccessibleName("Repeated label: 1 alternative");
    expect(within(categoryCards[1]).getByText(alternatives[1].name)).toBeInTheDocument();
    expect(categoryCards[2]).toHaveAccessibleName("Repeated label: 0 alternatives");
    expect(within(categoryCards[2]).getByText("No alternatives assigned.")).toBeInTheDocument();
    expect(data.result.categories.map(({ id }) => id)).toEqual(["cat-top", "cat-high", "cat-low"]);
    expect(data.result.displayMode).toBe("standard");
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

  it("uses responsive columns, bounded height, and vertical scrolling for long sorting results", () => {
    expect(sortingResultGridSx).toMatchObject({
      gridTemplateColumns: {
        xs: "minmax(0, 1fr)",
        sm: "repeat(2, minmax(0, 1fr))",
        xl: "repeat(3, minmax(0, 1fr))",
      },
      maxHeight: { xs: 340, md: 440 },
      overflowY: "auto",
      overflowX: "hidden",
    });
  });

  it("keeps TOPSIS-Sort category cards equal-height and scrolls only their alternative lists", () => {
    expect(topsisSortResultGridSx).toMatchObject({
      alignItems: "stretch",
    });
    expect(topsisSortResultGridSx.gridTemplateColumns).toEqual({
      xs: "minmax(0, 1fr)",
      sm: "repeat(2, minmax(0, 1fr))",
      xl: "repeat(3, minmax(0, 1fr))",
    });
    expect(topsisSortResultGridSx).not.toHaveProperty("maxHeight");
    expect(topsisSortResultGridSx).not.toHaveProperty("overflowY");
    expect(topsisSortCategoryCardSx).toMatchObject({
      display: "flex",
      flexDirection: "column",
      height: { xs: 228, sm: 300, md: 320 },
    });
    expect(topsisSortCategoryCardSx.height.xs).toBeLessThan(topsisSortCategoryCardSx.height.md);
    expect(topsisSortCategoryBodySx).toMatchObject({
      flex: "1 1 auto",
      minHeight: 0,
      overflowY: "auto",
      overflowX: "hidden",
      scrollbarWidth: "thin",
    });

    renderTopsisDashboard();
    const category = screen.getByRole("listitem", { name: "High: 1 alternative" });
    const header = within(category).getByText("High").closest("div");
    const body = within(category).getByTestId("topsis-sort-category-body");
    expect(header.compareDocumentPosition(body) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(body).toContainElement(within(category).getByText("Premium option"));
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
      "Least favorable classification",
    ]);
    expect(data.findings[0]).toMatchObject({ headline: "High" });
    expect(data.findings[0].text).toBe("Premium option received the most favorable classification in this evaluation, placing it in the High category.");
    expect(data.findings[1]).toMatchObject({ headline: "Medium / High" });
    expect(data.findings[1].text).toBe("Among the evaluated alternatives, Premium option was classified as High and is closest to the dividing line between Medium and High.");
    expect(data.findings[2]).toMatchObject({ headline: "Low" });
    expect(data.findings[2].text).toBe("At the other end, Budget option was placed in the Low category, receiving the least favorable classification in this evaluation.");
    expect(screen.getByText("Premium option")).toBeInTheDocument();
    expect(screen.getByText("Balanced option")).toBeInTheDocument();
    expect(screen.getByText("Budget option")).toBeInTheDocument();
    expect(screen.queryByText(/position|rank|score|winner/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/0\.01|closeness|distance|uncertainty|sensitivity/i)).not.toBeInTheDocument();
  });

  it("orders TOPSIS-Sort alternatives within an intermediate category by relative position and shows compact closeness cues", () => {
    const execution = topsisExecution({
      diagnostics: topsisDiagnostics({
        closeness_by_alternative_id: { "mongo-a": 0.51, "mongo-b": 0.6, "mongo-c": 0.69 },
      }),
      assignments: topsisAlternatives.map(({ id }) => ({ alternativeId: id, categoryId: "cat-medium" })),
    });
    const data = renderTopsisDashboard(execution);
    const category = screen.getByRole("listitem", { name: "Medium: 3 alternatives" });
    const rows = within(category).getAllByRole("listitem");

    expect(data.result.displayMode).toBe("topsis-sort");
    expect(rows.map((row) => row.getAttribute("aria-label"))).toEqual([
      "Budget option, Relative closeness 0.6900, Closer to higher category",
      "Balanced option, Relative closeness 0.6000, Centered in this category",
      "Premium option, Relative closeness 0.5100, Closer to lower category",
    ]);
    expect(within(category).getByRole("img", { name: "Position within category: 95%" })).toBeInTheDocument();
    expect(within(category).getByText("0.6900")).toBeInTheDocument();
    expect(within(category).getByText("Closer to higher category")).toBeInTheDocument();
    expect(screen.queryByText(/rank/i)).not.toBeInTheDocument();
    expect(screen.getAllByText("No alternatives in this category.")).toHaveLength(2);
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
    const lowest = screen.getByRole("listitem", { name: "Low: 2 alternatives" });
    const highest = screen.getByRole("listitem", { name: "High: 2 alternatives" });

    expect(within(lowest).getAllByRole("listitem").map((row) => row.getAttribute("aria-label"))).toEqual([
      "Balanced option, Relative closeness 0.3500, Closer to higher category",
      "Premium option, Relative closeness 0.1000, Centered in this category",
    ]);
    expect(within(lowest).getByRole("img", { name: "Position within category: 70%" })).toBeInTheDocument();
    expect(within(highest).getByRole("img", { name: "Position within category: 3%" })).toBeInTheDocument();
    expect(within(highest).getByRole("img", { name: "Position within category: 83%" })).toBeInTheDocument();
    expect(within(lowest).getByText("Closer to higher category")).toBeInTheDocument();
    expect(within(lowest).getByText("Centered in this category")).toBeInTheDocument();
    expect(within(highest).getByText("Closer to lower category")).toBeInTheDocument();
    expect(within(highest).getByText("Centered in this category")).toBeInTheDocument();
    expect(within(highest).queryByText(/higher category/)).not.toBeInTheDocument();
  });

  it("keeps category groups and closeness when boundary evidence is unavailable, but hides unreliable position cues", () => {
    const data = renderTopsisDashboard(topsisExecution({
      diagnostics: topsisDiagnostics({ closeness_by_profile_id: { "profile-medium": 0.7, "profile-high": 0.5 } }),
      assignments: topsisAlternatives.map(({ id }) => ({ alternativeId: id, categoryId: "cat-medium" })),
    }));
    const category = screen.getByRole("listitem", { name: "Medium: 3 alternatives" });
    const rows = within(category).getAllByRole("listitem");

    expect(rows.map((row) => row.getAttribute("aria-label"))).toEqual([
      "Premium option, Relative closeness 0.7100",
      "Balanced option, Relative closeness 0.5400",
      "Budget option, Relative closeness 0.2200",
    ]);
    expect(within(category).queryByRole("img", { name: /Position within category/ })).not.toBeInTheDocument();
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
    expect(data.findings[2].text).toContain("Balanced option and Budget option were placed in the Low category");
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
      "Least favorable classification",
    ]);
    expect(data.findings[0].text).toContain("received the most favorable classification");
    expect(data.findings[1].text).toContain("receiving the least favorable classification");
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
    expect(buildDashboardData({ payload: basePayload, selectedExecution: baseExecution }).findings).toHaveLength(3);

    const scenarioPayload = {
      alternatives: topsisAlternatives,
      models: { base: { name: "Other model" }, compatible: [{ id: "model-1", name: "TOPSIS-SORT" }] },
      scenarios: [{
        id: "scenario-1", name: "TOPSIS-SORT scenario",
        targetModel: { id: "model-1", name: "TOPSIS-SORT" },
        phaseResults: [{
          phase: 0, standardizedOutput: output,
          resultStructureKey: "sorting", resultStructureVersion: 1,
          modelSpecificOutput: { apiModelKey: "topsis_sort_2016" },
          requestSnapshot: { modelParameters },
        }],
      }],
    };
    const scenarioExecution = selectFinishedIssueExecution(scenarioPayload, "scenario-1");
    expect(scenarioExecution.model.technical?.apiModelKey).toBeUndefined();
    expect(scenarioExecution.modelSpecificOutput.apiModelKey).toBe("topsis_sort_2016");
    expect(buildDashboardData({ payload: scenarioPayload, selectedExecution: scenarioExecution }).findings).toHaveLength(3);
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
