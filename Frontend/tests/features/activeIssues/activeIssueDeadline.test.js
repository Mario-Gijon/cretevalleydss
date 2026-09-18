import dayjs from "dayjs";
import { describe, expect, it } from "vitest";

import { computeIssueDeadlineProgress } from "../../../src/features/activeIssues/logic/activeIssueDeadline.js";

const issueWithExpectedFinalization = {
  creationDate: "01-09-2026",
  closureDate: "11-09-2026",
  ui: {
    deadline: {
      hasDeadline: true,
    },
  },
};

describe("computeIssueDeadlineProgress", () => {
  it("uses whole calendar days to calculate elapsed expected-finalization progress", () => {
    const progress = computeIssueDeadlineProgress(
      issueWithExpectedFinalization,
      dayjs("2026-09-06T23:59:59")
    );

    expect(progress).toMatchObject({
      label: "11-09-2026",
      progress: 50,
    });
  });

  it("clamps passed expected-finalization dates to a complete line", () => {
    const progress = computeIssueDeadlineProgress(
      issueWithExpectedFinalization,
      dayjs("2026-09-20")
    );

    expect(progress?.progress).toBe(100);
  });

  it("does not return progress without an expected finalization date", () => {
    expect(
      computeIssueDeadlineProgress({
        ...issueWithExpectedFinalization,
        ui: { deadline: { hasDeadline: false } },
      })
    ).toBeNull();
  });
});
