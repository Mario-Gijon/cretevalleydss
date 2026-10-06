import { ThemeProvider, createTheme } from "@mui/material/styles";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import DashboardView from "../../../../../src/features/finishedIssueDialog/sections/dashboard/components/DashboardView";
import { buildDashboardData } from "../../../../../src/features/finishedIssueDialog/sections/dashboard/logic/buildFinishedIssueDashboardData.js";

const renderView = (data) => render(<ThemeProvider theme={createTheme()}><DashboardView data={data} /></ThemeProvider>);

describe("DashboardView Summary", () => {
  it("renders the three standalone Summary sections and canonical counts", () => {
    const data = buildDashboardData({
      payload: {
        issue: { name: "Issue title", description: "Issue description" },
        alternatives: [{ id: "a", name: "Alpha" }],
        criteria: { nodes: [{ id: "parent", isLeaf: false }, { id: "leaf", isLeaf: true }] },
        participants: [{ expert: { id: "e1" } }],
        models: { base: { name: "Linguistic Model" } },
      },
      selectedExecution: { model: { name: "Linguistic Model" }, standardizedOutput: { rankedAlternatives: [{ alternativeId: "a", score: 0.8 }] } },
    });
    renderView(data);
    expect(screen.getByRole("heading", { name: "Issue summary" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Final result" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Key findings" })).toBeInTheDocument();
    expect(screen.getByText("Alternatives")).toBeInTheDocument();
    expect(screen.getByText("Criteria")).toBeInTheDocument();
    expect(screen.getByText("Experts")).toBeInTheDocument();
    expect(screen.getByText("Evaluation model")).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Issue summary" })).getAllByText("1")).toHaveLength(3);
    expect(screen.getByText("Linguistic Model")).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Final result" })).getByRole("cell", { name: "Alpha" })).toBeInTheDocument();
    expect(screen.getByRole("list")).toBeInTheDocument();
    expect(screen.queryByText("Issue title")).not.toBeInTheDocument();
    expect(screen.queryByText("Issue description")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders every ranking entry and an accessible wrapped alternative name", () => {
    const ranking = Array.from({ length: 15 }, (_, index) => ({ id: `a${index}`, name: `A very long alternative name ${index}`, position: index + 1, formattedScore: "—" }));
    renderView({ issueSummary: { alternativesCount: 15, criteriaCount: 1, expertsCount: 1, modelName: "Model" }, result: { available: true, ranking }, findings: [] });
    expect(screen.getAllByRole("row")).toHaveLength(16);
    expect(screen.getByText("A very long alternative name 14")).toHaveAttribute("title", "A very long alternative name 14");
    expect(screen.getAllByText("—")).toHaveLength(15);
  });

  it("shows the simple empty message and no findings when the result is unavailable", () => {
    renderView({ issueSummary: { alternativesCount: 0, criteriaCount: 0, expertsCount: 0, modelName: "—" }, result: { available: false, ranking: [] }, findings: [] });
    expect(screen.getByText("No final result is available.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Key findings" })).not.toBeInTheDocument();
  });

  it("shows score bars only for finite, non-negative, descending scores with a positive leader", () => {
    const renderRanking = (scores) => {
      const ranking = scores.map((score, index) => ({ id: `a${index}`, name: `Alternative ${index + 1}`, position: index + 1, score, formattedScore: Number.isFinite(score) ? String(score) : "—" }));
      const data = { issueSummary: { alternativesCount: ranking.length, criteriaCount: 1, expertsCount: 1, modelName: "Model" }, result: { available: true, ranking }, findings: [] };
      return renderView(data);
    };

    const { unmount } = renderRanking([3, 2, 0]);
    expect(screen.getByRole("columnheader", { name: "Score visualization" })).toBeInTheDocument();
    unmount();

    for (const unsafeScores of [[3, -1], [0, 0], [2, 3], [2, null]]) {
      const result = renderRanking(unsafeScores);
      expect(screen.queryByRole("columnheader", { name: "Score visualization" })).not.toBeInTheDocument();
      result.unmount();
    }
  });
});
