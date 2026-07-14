import { describe, expect, it } from "vitest";

import { formatFinishedIssuePhaseLabel } from "../../../src/features/finishedIssueDialog/logic/formatFinishedIssuePhaseLabel.js";
import {
  FINISHED_ISSUE_TABS,
  FINISHED_ISSUE_VIEWS,
  getFinishedIssueParentTab,
  getFinishedIssueTabDefaultView,
} from "../../../src/features/finishedIssueDialog/logic/finishedIssueNavigation.js";

describe("finished issue navigation", () => {
  it("maps detailed views to their parent tabs", () => {
    expect(getFinishedIssueParentTab(FINISHED_ISSUE_VIEWS.ISSUE_DETAILS)).toBe(
      FINISHED_ISSUE_TABS.OVERVIEW
    );
    expect(getFinishedIssueParentTab(FINISHED_ISSUE_VIEWS.GRAPHS)).toBe(
      FINISHED_ISSUE_TABS.RESULTS
    );
    expect(getFinishedIssueTabDefaultView(FINISHED_ISSUE_TABS.OVERVIEW)).toBe(
      FINISHED_ISSUE_VIEWS.OVERVIEW
    );
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
