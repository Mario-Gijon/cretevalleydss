import { describe, expect, it } from "vitest";

import { formatNaturalList } from "../../../../../src/features/decisionPlugins/evaluations/structures/criteriaPairwiseAHP/components/formatNaturalList.js";

describe("formatNaturalList", () => {
  it("formats zero, one, or two items naturally", () => {
    expect(formatNaturalList([])).toBe("");
    expect(formatNaturalList(["A"])).toBe("A");
    expect(formatNaturalList(["A", "B"])).toBe("A and B");
  });

  it("formats three or more items with an English conjunction", () => {
    expect(formatNaturalList(["A", "B", "C"])).toBe("A, B and C");
    expect(formatNaturalList(["A", "B", "C", "D"])).toBe("A, B, C and D");
  });
});
