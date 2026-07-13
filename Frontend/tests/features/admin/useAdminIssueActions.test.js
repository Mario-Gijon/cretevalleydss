import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { editIssueExpertsAdminAction } from "../../../src/services/admin.service.js";
import { useAdminIssueActions } from "../../../src/features/admin/issues/hooks/useAdminIssueActions.js";

vi.mock("../../../src/services/admin.service.js", () => ({
  editIssueExpertsAdminAction: vi.fn(),
  getAllUsers: vi.fn(),
  reassignIssueOwner: vi.fn(),
}));

describe("useAdminIssueActions expert editing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setup = () => {
    const showSnackbarAlert = vi.fn();
    const fetchIssuesData = vi.fn().mockResolvedValue(undefined);
    const loadIssueDetail = vi.fn().mockResolvedValue(undefined);
    const closeDetail = vi.fn();
    const issueDetail = {
      id: "issue-1",
      model: { usesExpertWeights: true },
      adminActionsState: { canEditExperts: true },
      participants: [
        {
          expert: { email: "existing@example.com", name: "Existing" },
          weight: 1,
        },
      ],
    };
    const issueExpertsProgress = [
      { expert: { id: "expert-1", email: "existing@example.com" }, currentParticipant: true },
    ];

    const hook = renderHook(() =>
      useAdminIssueActions({
        showSnackbarAlert,
        issueDetail,
        selectedIssueRow: null,
        issueExpertsProgress,
        fetchIssuesData,
        loadIssueDetail,
        closeDetail,
      })
    );

    return {
      ...hook,
      showSnackbarAlert,
      fetchIssuesData,
    };
  };

  const prepareWeightedSave = async (result) => {
    act(() => result.current.setExpertsToAdd(["new@example.com"]));
    await act(async () => result.current.handleSaveExpertsChanges());
    expect(result.current.expertWeightsOpen).toBe(true);
  };

  it("closes the weight dialog and clears pending changes after success", async () => {
    editIssueExpertsAdminAction.mockResolvedValue({ success: true, message: "Updated" });
    const { result, fetchIssuesData } = setup();

    await prepareWeightedSave(result);
    await act(async () =>
      result.current.confirmExpertWeights({
        "existing@example.com": 0.6,
        "new@example.com": 0.4,
      })
    );

    expect(result.current.expertWeightsOpen).toBe(false);
    expect(result.current.expertsToAdd).toEqual([]);
    expect(result.current.expertsToRemove).toEqual([]);
    expect(fetchIssuesData).toHaveBeenCalledTimes(1);
    expect(result.current.actionBusy.editExperts).toBe(false);
  });

  it("keeps the dialog and pending changes after failure", async () => {
    editIssueExpertsAdminAction.mockResolvedValue({
      success: false,
      message: "Invalid weights",
    });
    const { result, fetchIssuesData, showSnackbarAlert } = setup();

    await prepareWeightedSave(result);
    await act(async () =>
      result.current.confirmExpertWeights({
        "existing@example.com": 0.6,
        "new@example.com": 0.4,
      })
    );

    expect(result.current.expertWeightsOpen).toBe(true);
    expect(result.current.expertsToAdd).toEqual(["new@example.com"]);
    expect(fetchIssuesData).not.toHaveBeenCalled();
    expect(showSnackbarAlert).toHaveBeenCalledWith("Invalid weights", "error");
    expect(result.current.actionBusy.editExperts).toBe(false);
  });
});
