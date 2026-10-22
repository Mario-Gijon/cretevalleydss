import { ThemeProvider, createTheme } from "@mui/material/styles";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import DashboardView from "../../../../../src/features/finishedIssueDialog/sections/dashboard/components/DashboardView.jsx";
import { buildDashboardData } from "../../../../../src/features/finishedIssueDialog/sections/dashboard/logic/buildFinishedIssueDashboardData.js";
import { sortingResultGridSx } from "../../../../../src/features/finishedIssueDialog/resultPresentations/presentations/sorting/v1/sortingResultGrid.styles.js";

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

const renderTopsisDashboard = (execution = topsisExecution({ diagnostics: topsisDiagnostics() })) => {
  const data = buildDashboardData({ payload: { alternatives: topsisAlternatives }, selectedExecution: execution });
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
    expect(data.findings[0]).toMatchObject({ headline: "High", alternatives: [{ name: "Premium option" }] });
    expect(data.findings[1]).toMatchObject({ headline: "Medium / High" });
    expect(data.findings[1].text).toContain("Premium option is closest");
    expect(data.findings[1].text).toContain("closeness difference 0.01");
    expect(data.findings[1].text).toContain("not uncertainty or sensitivity");
    expect(data.findings[2]).toMatchObject({ headline: "Low", alternatives: [{ name: "Budget option" }] });
    expect(screen.getAllByText("Premium option")).toHaveLength(2);
    expect(screen.getByText("Balanced option")).toBeInTheDocument();
    expect(screen.getAllByText("Budget option")).toHaveLength(2);
    expect(screen.queryByText(/position|rank|score|winner/i)).not.toBeInTheDocument();
  });

  it("uses the highest and lowest non-empty categories when an extreme category is empty", () => {
    const data = renderTopsisDashboard(topsisExecution({
      diagnostics: topsisDiagnostics(),
      assignments: [
        { alternativeId: "mongo-a", categoryId: "cat-medium" },
        { alternativeId: "mongo-b", categoryId: "cat-low" },
        { alternativeId: "mongo-c", categoryId: "cat-low" },
      ],
    }));
    expect(data.result.categories[0].label).toBe("High");
    expect(data.result.categories[0].alternatives).toHaveLength(0);
    expect(data.findings[0]).toMatchObject({ headline: "Medium", alternatives: [{ name: "Premium option" }] });
    expect(data.findings[2]).toMatchObject({ headline: "Low", alternatives: [{ name: "Balanced option" }, { name: "Budget option" }] });
  });

  it("reports no classification separation when every alternative shares one category", () => {
    const data = renderTopsisDashboard(topsisExecution({
      diagnostics: topsisDiagnostics(),
      assignments: topsisAlternatives.map(({ id }) => ({ alternativeId: id, categoryId: "cat-medium" })),
    }));
    expect(data.findings[1]).toMatchObject({
      kind: "classification_separation",
      headline: "No separation between classifications",
    });
    expect(data.findings[1].text).toContain("All alternatives were assigned to Medium");
    expect(data.findings[1].text).not.toContain(" / ");
    expect(data.findings[0].alternatives).toHaveLength(3);
    expect(data.findings[2].alternatives).toHaveLength(3);
  });

  it.each([
    ["missing diagnostics", undefined],
    ["malformed alternative closeness", { closeness_by_alternative_id: { "mongo-a": 0.4 }, closeness_by_profile_id: { "profile-medium": 0.5, "profile-high": 0.7 } }],
    ["non-finite profile closeness", { closeness_by_alternative_id: { "mongo-a": 0.71, "mongo-b": 0.54, "mongo-c": 0.22 }, closeness_by_profile_id: { "profile-medium": Number.NaN, "profile-high": 0.7 } }],
    ["missing profile configuration", topsisDiagnostics(), true],
  ])("falls back to category evidence for %s", (_label, diagnostics, missingProfiles = false) => {
    const execution = topsisExecution({ diagnostics });
    if (missingProfiles) execution.modelParameters.boundaryProfiles.profiles = [];
    const data = renderTopsisDashboard(execution);
    expect(data.findings).toHaveLength(3);
    expect(data.findings[1]).toMatchObject({ kind: "classification_spread", headline: "Low to High" });
    expect(data.findings[1].text).toContain("3 non-empty categories");
  });

  it("shows every exactly tied closest alternative-boundary pair", () => {
    const data = renderTopsisDashboard(topsisExecution({
      diagnostics: topsisDiagnostics({
        closeness_by_alternative_id: { "mongo-a": 0.71, "mongo-b": 0.49, "mongo-c": 0.22 },
      }),
    }));
    expect(data.findings[1]).toMatchObject({ kind: "closest_boundary", boundaryPairs: expect.any(Array) });
    expect(data.findings[1].boundaryPairs).toHaveLength(2);
    expect(data.findings[1].boundaryPairs.map(({ label }) => label)).toEqual(expect.arrayContaining([
      expect.stringContaining("Premium option: Medium / High"),
      expect.stringContaining("Balanced option: Low / Medium"),
    ]));
  });
});
