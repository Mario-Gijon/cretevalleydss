import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const context = vi.hoisted(() => ({
  dialog: { payload: { issue: { id: "issue" } } },
  resultsAnalysis: {
    selectedPhase: 0,
    selection: { selectedExecutionKeys: ["base"] },
  },
  resultsAnalysisNavigation: { activeView: "visualizations", setActiveView: vi.fn() },
}));
const buildWorkspace = vi.hoisted(() => vi.fn(() => ({ mode: "single" })));

vi.mock("../../../../../src/features/finishedIssueDialog/context/finishedIssueDialog.context", () => ({
  useFinishedIssueDialogContext: () => context,
}));
vi.mock("../../../../../src/features/finishedIssueDialog/sections/resultsAnalysis/logic/buildResultsAnalysisWorkspaceData.js", () => ({
  buildResultsAnalysisWorkspaceData: buildWorkspace,
}));
vi.mock("../../../../../src/features/finishedIssueDialog/sections/resultsAnalysis/components/ResultsAnalysisView", () => ({
  default: () => <div>Results Analysis View</div>,
}));

import ResultsAnalysisSection from "../../../../../src/features/finishedIssueDialog/sections/resultsAnalysis/ResultsAnalysisSection.jsx";

describe("ResultsAnalysisSection", () => {
  it("passes the header-selected phase to the shared Results Analysis workspace", () => {
    render(<ResultsAnalysisSection />);

    expect(buildWorkspace).toHaveBeenCalledWith({
      payload: context.dialog.payload,
      selectedExecutionKeys: ["base"],
      selectedPhase: 0,
    });
  });
});
