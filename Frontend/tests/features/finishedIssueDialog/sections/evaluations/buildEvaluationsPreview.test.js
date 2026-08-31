import { describe, expect, it } from "vitest";

import { buildEvaluationsData, buildEvaluationsPreview } from "../../../../../src/features/finishedIssueDialog/sections/evaluations/logic/buildEvaluationsData.js";
import { buildFinishedIssuePayloadFixture } from "../../../../mocks/fixtures/finishedIssueDialog.fixtures.js";

describe("buildEvaluationsPreview", () => {
  it("keeps the Dashboard preview generic and exposes the renderer contract", () => {
    const payload = buildFinishedIssuePayloadFixture();
    const preview = buildEvaluationsPreview(buildEvaluationsData({
      payload,
      selectedStage: "criteriaWeighting",
      selectedPhase: 1,
      selectedExpertId: "expert-1",
      showCollective: true,
    }));

    expect(preview).toEqual(expect.objectContaining({
      stage: "criteriaWeighting",
      stageLabel: "Criteria weighting",
      phase: 1,
      hasCollective: true,
      showCollective: true,
      renderer: expect.objectContaining({
        stage: "criteriaWeighting",
        structureKey: "manualCriteriaWeights",
        readOnly: true,
      }),
    }));
    expect(preview).not.toHaveProperty("matrix");
  });

  it("counts only completed individual evaluations as submissions", () => {
    const payload = buildFinishedIssuePayloadFixture();
    payload.evaluations.individual.push({
      id: "draft-evaluation",
      expertId: "expert-2",
      stage: "alternativeEvaluation",
      phase: 5,
      completed: false,
      submittedAt: null,
    });

    const preview = buildEvaluationsPreview(buildEvaluationsData({ payload }));

    expect(preview.evaluationsCount).toBe(2);
  });
});
