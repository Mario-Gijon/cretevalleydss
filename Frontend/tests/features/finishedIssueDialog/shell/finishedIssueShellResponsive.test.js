import { describe, expect, it } from "vitest";

import {
  finishedIssueHeaderControlsSx,
  finishedIssueHeaderIdentitySx,
  finishedIssueHeaderTitleSx,
} from "../../../../src/features/finishedIssueDialog/shell/finishedIssueShell.styles.js";

describe("finished issue shell responsive styles", () => {
  it("keeps the title flexible and the action controls fixed in the top row", () => {
    expect(finishedIssueHeaderIdentitySx.flex).toBe("1 1 auto");
    expect(finishedIssueHeaderControlsSx.flexShrink).toBe(0);
    expect(finishedIssueHeaderTitleSx.WebkitLineClamp).toEqual({ xs: 2, lg: 1 });
    expect(finishedIssueHeaderTitleSx.whiteSpace).toEqual({ xs: "normal", lg: "nowrap" });
  });
});
