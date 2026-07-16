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
});
