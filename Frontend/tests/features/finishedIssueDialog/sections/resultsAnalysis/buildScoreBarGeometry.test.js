import { describe, expect, it } from "vitest";

import { buildScoreBarGeometry } from "../../../../../src/features/finishedIssueDialog/sections/resultsAnalysis/logic/buildScoreBarGeometry.js";

const geometryFor = (score, scores) => buildScoreBarGeometry({
  score,
  domainMin: Math.min(0, ...scores.filter((value) => Number.isFinite(value))),
  domainMax: Math.max(0, ...scores.filter((value) => Number.isFinite(value))),
});

describe("buildScoreBarGeometry", () => {
  it("uses a zero-inclusive proportional domain for close positive scores", () => {
    const scores = [0.4266, 0.4199, 0.4133];
    expect(geometryFor(scores[0], scores).widthPercent).toBeCloseTo(100, 2);
    expect(geometryFor(scores[1], scores).widthPercent).toBeCloseTo(98.43, 2);
    expect(geometryFor(scores[2], scores).widthPercent).toBeCloseTo(96.88, 2);
    expect(geometryFor(scores[2], scores).widthPercent).not.toBeCloseTo(12, 2);
  });

  it("handles equal, zero, and single positive scores without invalid percentages", () => {
    expect(geometryFor(0.5, [0.5, 0.5]).widthPercent).toBe(100);
    expect(geometryFor(0, [0, 0]).widthPercent).toBe(0);
    expect(geometryFor(0.5, [0.5]).widthPercent).toBe(100);
    const zeroGeometry = geometryFor(0, [0, 0]);
    expect([zeroGeometry.leftPercent, zeroGeometry.widthPercent, zeroGeometry.zeroPercent].every(Number.isFinite)).toBe(true);
  });

  it("anchors negative scores at the right-side zero and crosses zero for mixed scores", () => {
    expect(geometryFor(-1, [-1, -0.5]).zeroPercent).toBe(100);
    expect(geometryFor(-1, [-1, -0.5]).leftPercent).toBe(0);
    expect(geometryFor(-0.5, [-1, -0.5]).widthPercent).toBe(50);

    const negative = geometryFor(-1, [-1, 1]);
    const positive = geometryFor(1, [-1, 1]);
    expect(negative).toMatchObject({ leftPercent: 0, widthPercent: 50, zeroPercent: 50, showZeroMarker: true });
    expect(positive).toMatchObject({ leftPercent: 50, widthPercent: 50, zeroPercent: 50, showZeroMarker: true });
  });

  it("does not fill invalid scores", () => {
    expect(buildScoreBarGeometry({ score: null, domainMin: 0, domainMax: 1 }).widthPercent).toBe(0);
    expect(buildScoreBarGeometry({ score: Number.NaN, domainMin: 0, domainMax: 1 }).widthPercent).toBe(0);
    expect(buildScoreBarGeometry({ score: Number.POSITIVE_INFINITY, domainMin: 0, domainMax: 1 }).widthPercent).toBe(0);
  });
});
