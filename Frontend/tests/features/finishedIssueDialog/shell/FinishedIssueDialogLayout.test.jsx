import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const contextValue = vi.hoisted(() => ({
  navigation: { activeView: "overview" },
}));

vi.mock("../../../../src/features/finishedIssueDialog/context/finishedIssueDialog.context", () => ({
  useFinishedIssueDialogContext: () => contextValue,
}));
vi.mock("../../../../src/features/finishedIssueDialog/sections/dashboard", () => ({ DashboardSection: () => <div>Dashboard section</div> }));
vi.mock("../../../../src/features/finishedIssueDialog/sections/overview", () => ({ OverviewSection: () => <div>Overview section</div> }));
vi.mock("../../../../src/features/finishedIssueDialog/sections/resultsAnalysis", () => ({ ResultsAnalysisSection: () => <div>Results section</div> }));
vi.mock("../../../../src/features/finishedIssueDialog/sections/consensus", () => ({ ConsensusSection: () => <div>Consensus section</div> }));
vi.mock("../../../../src/features/finishedIssueDialog/sections/evaluations", () => ({ EvaluationsSection: () => <div>Evaluations section</div> }));
vi.mock("../../../../src/features/finishedIssueDialog/sections/models", () => ({ ModelsSection: () => <div>Models section</div> }));

import FinishedIssueDialogLayout from "../../../../src/features/finishedIssueDialog/shell/FinishedIssueDialogLayout.jsx";

describe("FinishedIssueDialogLayout", () => {
  it("renders detailed sections without a redundant dashboard return button", () => {
    render(<FinishedIssueDialogLayout />);

    expect(screen.getByText("Overview section")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /back to dashboard/i })).not.toBeInTheDocument();
  });
});
