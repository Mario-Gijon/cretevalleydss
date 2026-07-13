import { describe, expect, it } from "vitest";

import { buildAutomaticLinguisticLabels } from "../../src/utils/linguisticMembershipFunctions.js";

describe("buildAutomaticLinguisticLabels", () => {
  it("generates the canonical balanced five-label triangular scale", () => {
    const labels = buildAutomaticLinguisticLabels({
      labelCount: 5,
      membershipFunction: "triangular",
      previousLabels: [
        { label: "Very Low" },
        { label: "Low" },
        { label: "Medium" },
        { label: "High" },
        { label: "Very High" },
      ],
    });

    expect(labels.map(({ values }) => values)).toEqual([
      [0, 0, 0.25],
      [0, 0.25, 0.5],
      [0.25, 0.5, 0.75],
      [0.5, 0.75, 1],
      [0.75, 1, 1],
    ]);
  });
});
