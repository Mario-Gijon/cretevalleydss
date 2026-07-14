import { describe, expect, it } from "vitest";

import { formatFinishedIssuePhaseLabel } from "../../../src/features/finishedIssueDialog/logic/formatFinishedIssuePhaseLabel.js";
import {
  FINISHED_ISSUE_TABS,
  FINISHED_ISSUE_VIEWS,
} from "../../../src/features/finishedIssueDialog/shared/logic/finishedIssueNavigation.js";

describe("finished issue navigation", () => {
  it("defines only the final top-level sections", () => {
    expect(FINISHED_ISSUE_VIEWS).toEqual({
      DASHBOARD: "dashboard",
      OVERVIEW: "overview",
      RESULTS_ANALYSIS: "results-analysis",
      EVALUATIONS: "evaluations",
      CONSENSUS: "consensus",
      MODELS: "models",
    });
    expect(FINISHED_ISSUE_TABS).toEqual(FINISHED_ISSUE_VIEWS);
  });

  it("formats finished phases without a current label", () => {
    expect(formatFinishedIssuePhaseLabel({ phaseIndex: 0, phasesCount: 1 })).toBe("Final");
    expect(formatFinishedIssuePhaseLabel({ phaseIndex: 0, phasesCount: 3 })).toBe("Initial");
    expect(formatFinishedIssuePhaseLabel({ phaseIndex: 1, phasesCount: 3 })).toBe("Round 1");
    expect(formatFinishedIssuePhaseLabel({ phaseIndex: 2, phasesCount: 3 })).toBe(
      "Final (Round 2)"
    );
  });
});
