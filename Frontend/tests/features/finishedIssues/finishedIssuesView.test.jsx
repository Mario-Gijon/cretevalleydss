import { act, renderHook, waitFor } from "@testing-library/react";
import { screen } from "@testing-library/react";
import { describe, expect, it, beforeEach, vi } from "vitest";

const mockUseIssuesDataContext = vi.hoisted(() => vi.fn());
const mockUseSnackbarAlertContext = vi.hoisted(() => vi.fn());

vi.mock("../../../src/context/issues/issues.context", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useIssuesDataContext: mockUseIssuesDataContext,
  };
});

vi.mock(
  "../../../src/context/snackbarAlert/snackbarAlert.context",
  async (importOriginal) => {
    const actual = await importOriginal();
    return {
      ...actual,
      useSnackbarAlertContext: mockUseSnackbarAlertContext,
    };
  }
);

vi.mock("../../../src/services/issue.service", () => ({
  removeFinishedIssue: vi.fn(),
}));

import FinishedIssuesView from "../../../src/features/finishedIssues/components/FinishedIssuesView.jsx";
import { useFinishedIssuesView } from "../../../src/features/finishedIssues/hooks/useFinishedIssuesView.js";
import { removeFinishedIssue } from "../../../src/services/issue.service";
import { finishedIssuesDashboardFixture } from "../../mocks/fixtures/finishedIssues.fixtures.js";
import { renderWithProviders } from "../../setup/renderWithProviders.jsx";

describe("useFinishedIssuesView", () => {
  const showSnackbarAlert = vi.fn();
  const fetchFinishedIssues = vi.fn().mockResolvedValue([]);
  const setIssueCreated = vi.fn();
  const setFinishedIssues = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSnackbarAlertContext.mockReturnValue({ showSnackbarAlert });
    mockUseIssuesDataContext.mockReturnValue({
      issueCreated: "",
      setIssueCreated,
      loading: false,
      finishedIssues: finishedIssuesDashboardFixture,
      setFinishedIssues,
      fetchFinishedIssues,
    });
  });

  it("openDetails sets the selected issue and opens the dialog", () => {
    const { result } = renderHook(() => useFinishedIssuesView());

    act(() => {
      result.current.openDetails(finishedIssuesDashboardFixture[0]);
    });

    expect(result.current.selectedIssue).toEqual(finishedIssuesDashboardFixture[0]);
    expect(result.current.openFinishedIssueDialog).toBe(true);
  });

  it("closeDetails clears the selected issue and closes the dialog", () => {
    const { result } = renderHook(() => useFinishedIssuesView());

    act(() => {
      result.current.openDetails(finishedIssuesDashboardFixture[0]);
      result.current.closeDetails();
    });

    expect(result.current.selectedIssue).toBeNull();
    expect(result.current.openFinishedIssueDialog).toBe(false);
  });

  it("handleRefresh calls fetchFinishedIssues and resets refreshing", async () => {
    const { result } = renderHook(() => useFinishedIssuesView());

    await act(async () => {
      await result.current.handleRefresh();
    });

    expect(fetchFinishedIssues).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(result.current.refreshing).toBe(false));
  });

  it("handleRemove removes the selected issue locally on success", async () => {
    removeFinishedIssue.mockResolvedValue({
      success: true,
      message: "Finished issue removed.",
    });

    const { result } = renderHook(() => useFinishedIssuesView());

    act(() => {
      result.current.openDetails(finishedIssuesDashboardFixture[0]);
      result.current.setOpenRemoveConfirmDialog(true);
    });

    await act(async () => {
      await result.current.handleRemove();
    });

    expect(removeFinishedIssue).toHaveBeenCalledWith("issue-finished-1");
    expect(setFinishedIssues).toHaveBeenCalledTimes(1);
    const updater = setFinishedIssues.mock.calls[0][0];
    expect(updater(finishedIssuesDashboardFixture).map((issue) => issue.id)).toEqual([
      "issue-finished-2",
      "issue-finished-3",
    ]);
    expect(result.current.selectedIssue).toBeNull();
    expect(result.current.openFinishedIssueDialog).toBe(false);
    expect(result.current.openRemoveConfirmDialog).toBe(false);
    expect(showSnackbarAlert).toHaveBeenCalledWith(
      "Finished issue removed.",
      "success"
    );
    await waitFor(() => expect(result.current.removeLoading).toBe(false));
  });

  it("handleRemove keeps state safe on error", async () => {
    removeFinishedIssue.mockResolvedValue({
      success: false,
      message: "Could not remove finished issue.",
    });

    const { result } = renderHook(() => useFinishedIssuesView());

    act(() => {
      result.current.openDetails(finishedIssuesDashboardFixture[0]);
      result.current.setOpenRemoveConfirmDialog(true);
    });

    await act(async () => {
      await result.current.handleRemove();
    });

    expect(setFinishedIssues).not.toHaveBeenCalled();
    expect(result.current.selectedIssue).toEqual(finishedIssuesDashboardFixture[0]);
    expect(result.current.openFinishedIssueDialog).toBe(true);
    expect(result.current.openRemoveConfirmDialog).toBe(false);
    expect(showSnackbarAlert).toHaveBeenCalledWith(
      "Could not remove finished issue.",
      "error"
    );
    await waitFor(() => expect(result.current.removeLoading).toBe(false));
  });

  it("does nothing when handleRemove is called without a selected issue", async () => {
    const { result } = renderHook(() => useFinishedIssuesView());

    await result.current.handleRemove();

    expect(removeFinishedIssue).not.toHaveBeenCalled();
    expect(setFinishedIssues).not.toHaveBeenCalled();
  });
});

describe("FinishedIssuesView smoke", () => {
  beforeEach(() => {
    mockUseSnackbarAlertContext.mockReturnValue({ showSnackbarAlert: vi.fn() });
  });

  it("renders a loading state when loading is true", () => {
    mockUseIssuesDataContext.mockReturnValue({
      issueCreated: "",
      setIssueCreated: vi.fn(),
      loading: true,
      finishedIssues: [],
      setFinishedIssues: vi.fn(),
      fetchFinishedIssues: vi.fn(),
    });

    renderWithProviders(<FinishedIssuesView />);

    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it('renders "No finished issues" when the list is empty', () => {
    mockUseIssuesDataContext.mockReturnValue({
      issueCreated: "",
      setIssueCreated: vi.fn(),
      loading: false,
      finishedIssues: [],
      setFinishedIssues: vi.fn(),
      fetchFinishedIssues: vi.fn(),
    });

    renderWithProviders(<FinishedIssuesView />);

    expect(screen.getByText("No finished issues")).toBeInTheDocument();
  });
});
