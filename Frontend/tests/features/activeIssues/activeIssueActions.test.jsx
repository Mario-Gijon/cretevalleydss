import { renderHook, waitFor } from "@testing-library/react";
import { screen } from "@testing-library/react";
import { describe, expect, it, beforeEach, vi } from "vitest";

vi.mock("../../../src/services/issue.service", () => ({
  removeIssue: vi.fn(),
  leaveIssue: vi.fn(),
  computeEvaluationStage: vi.fn(),
}));

import ActiveIssuesView from "../../../src/features/activeIssues/components/ActiveIssuesView.jsx";
import { useActiveIssueActions } from "../../../src/features/activeIssues/hooks/useActiveIssueActions.js";
import {
  computeEvaluationStage,
  leaveIssue,
  removeIssue,
} from "../../../src/services/issue.service";
import { renderWithProviders } from "../../setup/renderWithProviders.jsx";

const createDeps = () => ({
  showSnackbarAlert: vi.fn(),
  refresh: vi.fn().mockResolvedValue(undefined),
  closeDrawer: vi.fn(),
  setLoading: vi.fn(),
});

describe("useActiveIssueActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not call services when there is no selected issue", async () => {
    const deps = createDeps();
    const { result } = renderHook(() =>
      useActiveIssueActions({
        selectedIssue: null,
        ...deps,
      })
    );

    await result.current.handleRemoveIssue();
    await result.current.handleLeaveIssue();
    await result.current.handleComputeWeights();
    await result.current.handleResolveIssue();

    expect(removeIssue).not.toHaveBeenCalled();
    expect(leaveIssue).not.toHaveBeenCalled();
    expect(computeEvaluationStage).not.toHaveBeenCalled();
  });

  it("removes the selected issue on success", async () => {
    removeIssue.mockResolvedValue({
      success: true,
      message: "Issue removed successfully",
    });
    const deps = createDeps();
    const { result } = renderHook(() =>
      useActiveIssueActions({
        selectedIssue: { id: "issue-1" },
        ...deps,
      })
    );

    await result.current.handleRemoveIssue();

    expect(removeIssue).toHaveBeenCalledWith("issue-1");
    expect(deps.showSnackbarAlert).toHaveBeenCalledWith(
      "Issue removed successfully",
      "success"
    );
    expect(deps.refresh).toHaveBeenCalledTimes(1);
    expect(deps.closeDrawer).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(result.current.busy.remove).toBe(false));
  });

  it("keeps the drawer open on remove error and resets busy state", async () => {
    removeIssue.mockResolvedValue({
      success: false,
      message: "Error removing issue",
    });
    const deps = createDeps();
    const { result } = renderHook(() =>
      useActiveIssueActions({
        selectedIssue: { id: "issue-1" },
        ...deps,
      })
    );

    await result.current.handleRemoveIssue();

    expect(deps.showSnackbarAlert).toHaveBeenCalledWith(
      "Error removing issue",
      "error"
    );
    expect(deps.closeDrawer).not.toHaveBeenCalled();
    await waitFor(() => expect(result.current.busy.remove).toBe(false));
  });

  it("leaves the selected issue on success", async () => {
    leaveIssue.mockResolvedValue({
      success: true,
      message: "Issue left successfully",
    });
    const deps = createDeps();
    const { result } = renderHook(() =>
      useActiveIssueActions({
        selectedIssue: { id: "issue-2" },
        ...deps,
      })
    );

    await result.current.handleLeaveIssue();

    expect(leaveIssue).toHaveBeenCalledWith("issue-2");
    expect(deps.showSnackbarAlert).toHaveBeenCalledWith(
      "Issue left successfully",
      "success"
    );
    expect(deps.refresh).toHaveBeenCalledTimes(1);
    expect(deps.closeDrawer).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(result.current.busy.leave).toBe(false));
  });

  it("computes weights and refreshes finished issues when the stage finishes the issue", async () => {
    computeEvaluationStage.mockResolvedValue({
      success: true,
      message: "Weights computed successfully",
      data: { currentStage: "finished" },
    });
    const deps = createDeps();
    const { result } = renderHook(() =>
      useActiveIssueActions({
        selectedIssue: { id: "issue-3" },
        ...deps,
      })
    );

    await result.current.handleComputeWeights();

    expect(computeEvaluationStage).toHaveBeenCalledWith(
      "issue-3",
      "criteriaWeighting"
    );
    expect(deps.showSnackbarAlert).toHaveBeenCalledWith(
      "Weights computed successfully",
      "success"
    );
    expect(deps.refresh).toHaveBeenCalledWith({ alsoFinished: true });
    expect(deps.closeDrawer).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(result.current.busy.compute).toBe(false));
  });

  it("resolves the selected issue and refreshes finished issues when the backend marks it finished", async () => {
    computeEvaluationStage.mockResolvedValue({
      success: true,
      message: "Alternative evaluation computed successfully",
      data: { currentStage: "finished" },
    });
    const deps = createDeps();
    const { result } = renderHook(() =>
      useActiveIssueActions({
        selectedIssue: { id: "issue-4" },
        ...deps,
      })
    );

    await result.current.handleResolveIssue();

    expect(computeEvaluationStage).toHaveBeenCalledWith(
      "issue-4",
      "alternativeEvaluation"
    );
    expect(deps.refresh).toHaveBeenCalledWith({ alsoFinished: true });
    expect(deps.closeDrawer).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(result.current.busy.resolve).toBe(false));
  });

  it("handles compute errors with the current UX behavior", async () => {
    computeEvaluationStage.mockResolvedValue({
      success: false,
      message: "Error computing weights",
    });
    const deps = createDeps();
    const { result } = renderHook(() =>
      useActiveIssueActions({
        selectedIssue: { id: "issue-5" },
        ...deps,
      })
    );

    await result.current.handleComputeWeights();

    expect(deps.showSnackbarAlert).toHaveBeenCalledWith(
      "Error computing weights",
      "error"
    );
    expect(deps.setLoading).toHaveBeenCalledWith(false);
    expect(deps.closeDrawer).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(result.current.busy.compute).toBe(false));
  });

  it("handles resolve errors with the current UX behavior", async () => {
    computeEvaluationStage.mockResolvedValue({
      success: false,
      message: "Error resolving issue",
    });
    const deps = createDeps();
    const { result } = renderHook(() =>
      useActiveIssueActions({
        selectedIssue: { id: "issue-6" },
        ...deps,
      })
    );

    await result.current.handleResolveIssue();

    expect(deps.showSnackbarAlert).toHaveBeenCalledWith(
      "Error resolving issue",
      "error"
    );
    expect(deps.setLoading).toHaveBeenCalledWith(false);
    expect(deps.closeDrawer).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(result.current.busy.resolve).toBe(false));
  });
});

describe("ActiveIssuesView smoke", () => {
  it("renders a loading state when the issues context is loading", () => {
    renderWithProviders(<ActiveIssuesView />, {
      issuesValue: {
        loading: true,
      },
    });

    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it('renders "No active issues" when the list is empty', () => {
    renderWithProviders(<ActiveIssuesView />, {
      issuesValue: {
        loading: false,
        activeIssues: [],
      },
    });

    expect(screen.getByText("No active issues")).toBeInTheDocument();
  });
});
