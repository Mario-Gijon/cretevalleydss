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
});
