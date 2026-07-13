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

  const setup = (selectedIssue = issue, initialExperts = []) => {
    const showSnackbarAlert = vi.fn();
    const refresh = vi.fn().mockResolvedValue(undefined);
    const setBusy = vi.fn();

    const hook = renderHook(() =>
      useIssueExperts({
        selectedIssue,
        initialExperts,
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

  it("opens the weight flow with the final expert set for weighted models", async () => {
    const weightedIssue = {
      ...issue,
      usesExpertWeights: true,
      expertParticipants: [
        { email: "existing@example.com", name: "Existing", weight: 1 },
        { email: "remove@example.com", name: "Remove", weight: 0 },
      ],
      acceptedButNotEvaluatedExperts: ["existing@example.com", "remove@example.com"],
    };
    const { result } = setup(weightedIssue, [
      { email: "new@example.com", name: "New expert" },
    ]);

    act(() => {
      result.current.markRemoveExpert("remove@example.com");
      result.current.setExpertsToAdd(["new@example.com"]);
    });
    await act(async () => result.current.saveExpertsChanges());

    expect(editExperts).not.toHaveBeenCalled();
    expect(result.current.openExpertWeightsDialog).toBe(true);
    expect(result.current.expertParticipants).toEqual([
      expect.objectContaining({ email: "existing@example.com", weight: 1 }),
      expect.objectContaining({ email: "new@example.com", weight: 0, isNew: true }),
    ]);
  });

  it("sends confirmed weights for weighted models", async () => {
    editExperts.mockResolvedValue({ success: true, message: "Updated" });
    const weightedIssue = {
      ...issue,
      usesExpertWeights: true,
      expertParticipants: [{ email: "existing@example.com", weight: 1 }],
    };
    const { result } = setup(weightedIssue, [
      { email: "new@example.com", name: "New expert" },
    ]);

    act(() => result.current.setExpertsToAdd(["new@example.com"]));
    await act(async () => result.current.saveExpertsChanges());
    await act(async () =>
      result.current.confirmExpertWeights({
        "existing@example.com": 0.6,
        "new@example.com": 0.4,
      })
    );

    expect(editExperts).toHaveBeenCalledWith(
      "issue-1",
      ["new@example.com"],
      [],
      { "existing@example.com": 0.6, "new@example.com": 0.4 }
    );
  });
});
