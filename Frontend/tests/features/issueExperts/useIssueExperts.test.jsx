import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { editExperts } from "../../../src/services/issue.service.js";
import { useIssueExperts } from "../../../src/features/issueExperts/hooks/useIssueExperts.js";

vi.mock("../../../src/services/issue.service.js", () => ({
  editExperts: vi.fn(),
}));

describe("useIssueExperts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const issue = {
    id: "issue-1",
    participatedExperts: ["existing@example.com"],
    acceptedButNotEvaluatedExperts: [],
    pendingExperts: [],
    notAcceptedExperts: [],
  };

  const setup = () => {
    const showSnackbarAlert = vi.fn();
    const refresh = vi.fn().mockResolvedValue(undefined);
    const setBusy = vi.fn();

    const hook = renderHook(() =>
      useIssueExperts({
        selectedIssue: issue,
        initialExperts: [],
        showSnackbarAlert,
        refresh,
        setBusy,
      })
    );

    return { ...hook, showSnackbarAlert, refresh, setBusy };
  };

  it("saves added experts directly without domain assignments", async () => {
    editExperts.mockResolvedValue({ success: true, message: "Updated" });
    const { result, refresh } = setup();

    act(() => result.current.setExpertsToAdd(["new@example.com"]));
    await act(async () => result.current.saveExpertsChanges());

    expect(editExperts).toHaveBeenCalledWith(
      "issue-1",
      ["new@example.com"],
      []
    );
    expect(refresh).toHaveBeenCalled();
  });

  it("keeps the issue from being left without experts", async () => {
    const { result, showSnackbarAlert } = setup();

    act(() => result.current.markRemoveExpert("existing@example.com"));
    await act(async () => result.current.saveExpertsChanges());

    expect(editExperts).not.toHaveBeenCalled();
    expect(showSnackbarAlert).toHaveBeenCalledWith(
      "An issue must have at least one expert.",
      "error"
    );
  });
});
