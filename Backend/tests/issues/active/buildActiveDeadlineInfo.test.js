import { describe, expect, it } from "vitest";

import { buildDeadlineInfo } from "../../../modules/issues/active/buildActiveDeadlineInfo.js";

const noDeadline = {
  hasDeadline: false,
  daysLeft: null,
  overdue: false,
  iso: null,
};

describe("buildDeadlineInfo", () => {
  it("strictly parses persisted DD-MM-YYYY dates", () => {
    const deadline = buildDeadlineInfo("25-09-2026");

    expect(deadline).toMatchObject({
      hasDeadline: true,
      overdue: false,
      iso: expect.any(String),
    });
  });

  it("returns no deadline for null", () => {
    expect(buildDeadlineInfo(null)).toEqual(noDeadline);
  });

  it("returns no deadline for an invalid formatted date", () => {
    expect(buildDeadlineInfo("31-02-2026")).toEqual(noDeadline);
  });

  it("keeps a valid past date as a deadline and marks it overdue", () => {
    expect(buildDeadlineInfo("01-01-2000")).toMatchObject({
      hasDeadline: true,
      overdue: true,
    });
  });
});
