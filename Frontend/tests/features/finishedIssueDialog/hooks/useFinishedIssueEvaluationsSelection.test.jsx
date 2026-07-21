import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useFinishedIssueEvaluationsSelection } from "../../../../src/features/finishedIssueDialog/hooks/useFinishedIssueEvaluationsSelection.js";
import { buildFinishedIssuePayloadFixture } from "../../../mocks/fixtures/finishedIssueDialog.fixtures.js";

const payloadWithDistinctPhaseExperts = () => {
  const payload = buildFinishedIssuePayloadFixture();
  payload.participants.push({ id: "p-3", expert: { id: "expert-3", name: "Initial only", email: "initial@example.test" }, invitationStatus: "accepted" });
  payload.evaluations.individual.push({ id: "alt-0-expert-3", expertId: "expert-3", stage: "alternativeEvaluation", phase: 0, rawPayload: { phase: 0 }, completed: true });
  return payload;
};

describe("useFinishedIssueEvaluationsSelection", () => {
  it("keeps expert and collective state only, preserving or falling back as the external phase changes", async () => {
    const payload = payloadWithDistinctPhaseExperts();
    const { result, rerender } = renderHook(({ selectedPhase }) => useFinishedIssueEvaluationsSelection({ payload, selectedPhase }), { initialProps: { selectedPhase: 5 } });

    await waitFor(() => expect(result.current.selectedExpertId).toBe("expert-1"));
    act(() => result.current.setShowCollective(true));
    rerender({ selectedPhase: 0 });
    expect(result.current.selectedExpertId).toBe("expert-1");
    expect(result.current.showCollective).toBe(true);
    act(() => result.current.setSelectedExpertId("expert-3"));
    rerender({ selectedPhase: 5 });
    await waitFor(() => expect(result.current.selectedExpertId).toBe("expert-1"));
    expect(result.current).not.toHaveProperty("selectedConsensusPhase");
    expect(result.current).not.toHaveProperty("setSelectedConsensusPhase");
  });
});
