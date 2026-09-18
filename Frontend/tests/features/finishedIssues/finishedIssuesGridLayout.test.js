import { describe, expect, it } from "vitest";

import { theme } from "../../../src/theme/appTheme.js";
import {
  FINISHED_ISSUE_CARD_HEIGHT,
  getFinishedIssuesDesktopGridHeightSx,
} from "../../../src/features/finishedIssues/styles/finishedIssues.styles.js";

describe("Finished Issues desktop grid slot", () => {
  it("keeps the existing fixed card height", () => {
    expect(FINISHED_ISSUE_CARD_HEIGHT).toBe(328);
  });

  it("reserves three card rows and two grid gaps at lg", () => {
    const sx = getFinishedIssuesDesktopGridHeightSx(theme);

    expect(sx.height.lg).toBe(
      `calc(${FINISHED_ISSUE_CARD_HEIGHT * 3}px + ${theme.spacing(4)})`
    );
  });

  it("reserves two card rows and one grid gap at xl", () => {
    const sx = getFinishedIssuesDesktopGridHeightSx(theme);

    expect(sx.height.xl).toBe(
      `calc(${FINISHED_ISSUE_CARD_HEIGHT * 2}px + ${theme.spacing(2)})`
    );
  });
});
