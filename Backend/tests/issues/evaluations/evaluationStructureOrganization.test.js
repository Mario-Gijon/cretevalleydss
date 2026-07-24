import { describe, expect, it } from "vitest";

import { getAlternativeCriteriaMatrixPayload } from "../../../modules/decisionPlugins/evaluations/structures/alternativeCriteriaMatrix/alternativeCriteriaMatrix.get.js";
import { saveAlternativeCriteriaMatrixPayload } from "../../../modules/decisionPlugins/evaluations/structures/alternativeCriteriaMatrix/alternativeCriteriaMatrix.save.js";
import { alternativeCriteriaMatrixStructure } from "../../../modules/decisionPlugins/evaluations/structures/alternativeCriteriaMatrix/index.js";
import { getAlternativePairwiseByCriterionPayload } from "../../../modules/decisionPlugins/evaluations/structures/alternativePairwiseByCriterion/alternativePairwiseByCriterion.get.js";
import { saveAlternativePairwiseByCriterionPayload } from "../../../modules/decisionPlugins/evaluations/structures/alternativePairwiseByCriterion/alternativePairwiseByCriterion.save.js";
import { alternativePairwiseByCriterionStructure } from "../../../modules/decisionPlugins/evaluations/structures/alternativePairwiseByCriterion/index.js";
import { getBestWorstCriteriaPayload } from "../../../modules/decisionPlugins/evaluations/structures/bestWorstCriteria/bestWorstCriteria.get.js";
import { saveBestWorstCriteriaPayload } from "../../../modules/decisionPlugins/evaluations/structures/bestWorstCriteria/bestWorstCriteria.save.js";
import { bestWorstCriteriaStructure } from "../../../modules/decisionPlugins/evaluations/structures/bestWorstCriteria/index.js";
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
  it.each([
    [
      alternativeCriteriaMatrixStructure,
      getAlternativeCriteriaMatrixPayload,
      saveAlternativeCriteriaMatrixPayload,
    ],
    [
      alternativePairwiseByCriterionStructure,
      getAlternativePairwiseByCriterionPayload,
      saveAlternativePairwiseByCriterionPayload,
    ],
    [
      bestWorstCriteriaStructure,
      getBestWorstCriteriaPayload,
      saveBestWorstCriteriaPayload,
    ],
    [
      manualCriteriaWeightsStructure,
      getManualCriteriaWeightsPayload,
      saveManualCriteriaWeightsPayload,
    ],
  ])("registers direct get and save function references", (structure, get, save) => {
    expect(structure.get).toBe(get);
    expect(structure.save).toBe(save);
  });

  it("preserves best-worst GET initialization and stored payload normalization", async () => {
    await expect(
      getBestWorstCriteriaPayload({
        payload: undefined,
        decisionContext,
      })
    ).resolves.toEqual({
      bestCriterion: "",
      worstCriterion: "",
      bestToOthers: { cost: "", quality: "" },
      othersToWorst: { cost: "", quality: "" },
    });

    await expect(
      getBestWorstCriteriaPayload({
        payload: {
          bestCriterion: " cost ",
          worstCriterion: "quality",
          bestToOthers: { cost: 1, quality: 3, unknown: 8 },
          othersToWorst: { cost: 2, quality: 1, unknown: 8 },
        },
        decisionContext,
      })
    ).resolves.toEqual({
      bestCriterion: "cost",
      worstCriterion: "quality",
      bestToOthers: { cost: 1, quality: 3 },
      othersToWorst: { cost: 2, quality: 1 },
    });
  });

  it("preserves best-worst draft and submit save behavior", async () => {
    const payload = {
      bestCriterion: "cost",
      worstCriterion: "quality",
      bestToOthers: { cost: 9, quality: "3" },
      othersToWorst: { cost: "2", quality: 9 },
    };

    await expect(
      saveBestWorstCriteriaPayload({
        payload,
        decisionContext,
        mode: "draft",
      })
    ).resolves.toEqual({
      bestCriterion: "cost",
      worstCriterion: "quality",
      bestToOthers: { cost: 1, quality: 3 },
      othersToWorst: { cost: 2, quality: 1 },
    });

    await expect(
      saveBestWorstCriteriaPayload({
        payload,
        decisionContext,
        mode: "submit",
      })
    ).resolves.toEqual({
      bestCriterion: "cost",
      worstCriterion: "quality",
      bestToOthers: { cost: 1, quality: 3 },
      othersToWorst: { cost: 2, quality: 1 },
    });
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
