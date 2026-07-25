import { describe, expect, it } from "vitest";

import { getManualCriteriaWeightsPayload } from "../../../modules/decisionPlugins/evaluations/structures/manualCriteriaWeights/manualCriteriaWeights.get.js";
import { saveManualCriteriaWeightsPayload } from "../../../modules/decisionPlugins/evaluations/structures/manualCriteriaWeights/manualCriteriaWeights.save.js";
import { manualCriteriaWeightsStructure } from "../../../modules/decisionPlugins/evaluations/structures/manualCriteriaWeights/index.js";

const decisionContext = {
  leafCriteria: [
    { id: "cost", name: "Cost" },
    { id: "quality", name: "Quality" },
  ],
};

describe("evaluation structure organization", () => {
  it("registers direct manual-weight get and save function references", () => {
    expect(manualCriteriaWeightsStructure.get).toBe(
      getManualCriteriaWeightsPayload
    );
    expect(manualCriteriaWeightsStructure.save).toBe(
      saveManualCriteriaWeightsPayload
    );
  });

  it("preserves manual-weight GET, draft, and submit behavior", async () => {
    await expect(
      getManualCriteriaWeightsPayload({
        payload: undefined,
        decisionContext,
      })
    ).resolves.toEqual({
      weightsByCriterion: { cost: "", quality: "" },
    });

    await expect(
      getManualCriteriaWeightsPayload({
        payload: {
          weightsByCriterion: { cost: 0.4, quality: 0.6, unknown: 1 },
        },
        decisionContext,
      })
    ).resolves.toEqual({
      weightsByCriterion: { cost: 0.4, quality: 0.6 },
    });

    await expect(
      saveManualCriteriaWeightsPayload({
        payload: { weightsByCriterion: { cost: "", quality: "0.6" } },
        decisionContext,
        mode: "draft",
      })
    ).resolves.toEqual({
      weightsByCriterion: { cost: "", quality: 0.6 },
    });

    await expect(
      saveManualCriteriaWeightsPayload({
        payload: { weightsByCriterion: { cost: "0.4", quality: 0.6 } },
        decisionContext,
        mode: "submit",
      })
    ).resolves.toEqual({
      weightsByCriterion: { cost: 0.4, quality: 0.6 },
    });
  });
});
