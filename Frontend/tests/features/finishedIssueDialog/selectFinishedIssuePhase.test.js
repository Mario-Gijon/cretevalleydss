import { describe, expect, it } from "vitest";

import {
  getLastPhaseIndex,
  getLeafCriteriaNamesFallback,
  getRoundsCount,
  hasSingleLeafCriterion,
} from "../../../src/features/finishedIssueDialog/logic/selectFinishedIssuePhase.js";
import {
  buildFinishedIssueBaseFixture,
  buildSingleCriterionFinishedIssueFixture,
} from "../../mocks/fixtures/finishedIssueDialog.fixtures.js";

describe("selectFinishedIssuePhase", () => {
  it("returns one round for missing or malformed consensus payloads", () => {
    expect(getRoundsCount({})).toBe(1);
    expect(
      getRoundsCount({
        consensusHistory: [{ phase: "bad" }, { phase: -1 }],
        alternativesRankings: null,
      })
    ).toBe(1);
  });

  it("derives rounds count and last phase from multi-phase consensus payloads", () => {
    const issue = buildFinishedIssueBaseFixture();

    expect(getRoundsCount(issue)).toBe(2);
    expect(getLastPhaseIndex(issue)).toBe(1);
  });

  it("falls back safely when phase arrays are malformed", () => {
    const issue = {
      consensusHistory: [{ phase: "oops" }],
      consensusRounds: [{ phase: -2 }],
      consensus: [{ phase: undefined }],
      expertsRatings: {
        x: {},
        4: {},
      },
    };

    expect(getLastPhaseIndex(issue)).toBe(4);
    expect(getRoundsCount(issue)).toBe(5);
  });

  it("detects single-leaf issues in flat and nested criteria payloads", () => {
    const singleIssue = buildSingleCriterionFinishedIssueFixture();
    const nestedIssue = buildFinishedIssueBaseFixture();

    expect(hasSingleLeafCriterion(singleIssue)).toBe(true);
    expect(hasSingleLeafCriterion(nestedIssue)).toBe(false);
  });

  it("extracts nested leaf criterion names and tolerates malformed criteria", () => {
    const issue = buildFinishedIssueBaseFixture();

    expect(getLeafCriteriaNamesFallback(issue.summary.criteria)).toEqual([
      "Cost",
      "Quality",
    ]);
    expect(getLeafCriteriaNamesFallback(null)).toEqual([]);
  });
});
