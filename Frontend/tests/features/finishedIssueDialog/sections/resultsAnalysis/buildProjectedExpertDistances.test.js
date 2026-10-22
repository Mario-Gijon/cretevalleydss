import { describe, expect, it } from "vitest";

import { buildProjectedExpertDistances } from "../../../../../src/features/finishedIssueDialog/sections/resultsAnalysis/logic/buildProjectedExpertDistances.js";

describe("buildProjectedExpertDistances", () => {
  it("keeps exact zero distances distinct from positive distances rounded to 0.000", () => {
    const rows = buildProjectedExpertDistances({
      available: true,
      collectivePoint: { x: 0, y: 0 },
      expertPoints: [
        { x: 0.0004, y: 0, identity: "expert-a", label: "A" },
        { x: 0.00045, y: 0, identity: "expert-b", label: "B" },
        { x: 0, y: 0, identity: "expert-c", label: "C" },
      ],
    });

    expect(rows.map((row) => row.distance)).toEqual([0, 0.0004, 0.00045]);
    expect(rows.map((row) => row.formattedDistance)).toEqual([
      "0.000",
      "0.0004",
      "0.00045",
    ]);
    expect(rows.map((row) => row.closest)).toEqual([true, false, false]);
  });

  it("preserves exact projected zeroes without inventing a minimum distance", () => {
    const rows = buildProjectedExpertDistances({
      available: true,
      collectivePoint: { x: 1, y: -2 },
      expertPoints: [
        { x: 1, y: -2, identity: "expert-a" },
        { x: 1, y: -2, identity: "expert-b" },
      ],
    });

    expect(rows.map((row) => row.distance)).toEqual([0, 0]);
    expect(rows.map((row) => row.formattedDistance)).toEqual(["0.000", "0.000"]);
    expect(rows.every((row) => row.closest)).toBe(true);
  });
});
