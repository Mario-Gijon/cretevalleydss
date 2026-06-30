import { describe, expect, it } from "vitest";

import {
  getCompatReason,
  isModelCompatible,
} from "../../../src/features/finishedIssueDialog/logic/buildFinishedScenarioRuns.js";

describe("buildFinishedScenarioRuns", () => {
  it("uses explicit scenario compatibility flags when present", () => {
    const model = {
      scenarioCompatibility: {
        compatible: false,
        reasons: ["Evaluation structure mismatch", "No crisp support"],
      },
    };

    expect(isModelCompatible(model)).toBe(false);
    expect(getCompatReason(model, "crisp")).toBe(
      "Evaluation structure mismatch · No crisp support"
    );
  });

  it("derives compatibility from legacy flags when explicit scenario compatibility is absent", () => {
    const model = {
      compatibility: {
        alternativeEvaluationStructure: false,
        domain: false,
      },
      supportsConsensus: true,
    };

    expect(isModelCompatible(model)).toBe(false);
    expect(getCompatReason(model, "fuzzy")).toBe(
      "Evaluation structure mismatch · No fuzzy support · Consensus scenarios are not supported"
    );
  });

  it("treats models as compatible when no blocker flags are present", () => {
    const model = {
      compatibility: {
        alternativeEvaluationStructure: true,
        domain: true,
      },
      supportsConsensus: false,
    };

    expect(isModelCompatible(model)).toBe(true);
    expect(getCompatReason(model, "crisp")).toBe("");
  });
});
