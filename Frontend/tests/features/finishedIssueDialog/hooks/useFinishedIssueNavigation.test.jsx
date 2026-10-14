import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useFinishedIssueNavigation } from "../../../../src/features/finishedIssueDialog/hooks/useFinishedIssueNavigation.js";

describe("useFinishedIssueNavigation", () => {
  it("defaults and reopens Analysis on Visualizations, rejecting the removed Outcome view", () => {
    const { result, rerender } = renderHook(
      ({ open }) => useFinishedIssueNavigation({ payload: {}, open }),
      { initialProps: { open: true } }
    );

    expect(result.current.activeResultsAnalysisView).toBe("visualizations");

    act(() => result.current.setActiveResultsAnalysisView("interpretation"));
    expect(result.current.activeResultsAnalysisView).toBe("interpretation");

    act(() => result.current.setActiveResultsAnalysisView("outcome"));
    expect(result.current.activeResultsAnalysisView).toBe("interpretation");

    rerender({ open: false });
    rerender({ open: true });
    expect(result.current.activeResultsAnalysisView).toBe("visualizations");

    act(() => result.current.setActiveResultsAnalysisView("interpretation"));
    act(() => result.current.handleSelectTab("dashboard"));
    act(() => result.current.handleSelectTab("results-analysis"));
    expect(result.current.activeResultsAnalysisView).toBe("visualizations");
  });
});
