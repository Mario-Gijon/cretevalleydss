import { describe, expect, it } from "vitest";

import {
  finishedIssueContentFrameSx,
  finishedIssueHeaderControlsSx,
  finishedIssueHeaderRowSx,
  finishedIssueNavigationSx,
} from "../../../../src/features/finishedIssueDialog/shell/finishedIssueShell.styles.js";

describe("finished issue shell responsive styles", () => {
  it("lets navigation use remaining width while reserving room for header controls", () => {
    expect(finishedIssueNavigationSx.flex).toBe("1 1 auto");
    expect(finishedIssueNavigationSx.minWidth).toBe(0);
    expect(finishedIssueNavigationSx.maxWidth).toBe("100%");
    expect(finishedIssueNavigationSx["& .MuiTabs-scroller"].minWidth).toBe(0);
    expect(finishedIssueHeaderControlsSx.flexShrink).toBe(0);
    expect(finishedIssueHeaderRowSx.minWidth).toBe(0);
    expect(finishedIssueContentFrameSx).toMatchObject({ width: "100%", minWidth: 0 });
  });
});
