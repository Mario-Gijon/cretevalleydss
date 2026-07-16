import { describe, expect, it } from "vitest";

import {
  finishedIssueHeaderControlsSx,
  finishedIssueHeaderIdentitySx,
} from "../../../../src/features/finishedIssueDialog/shell/finishedIssueShell.styles.js";

describe("finished issue shell responsive styles", () => {
  it("uses natural-height header children before the desktop breakpoint", () => {
    expect(finishedIssueHeaderIdentitySx.flex).toEqual({
      xs: "0 0 auto",
      lg: "1 1 360px",
    });
    expect(finishedIssueHeaderControlsSx.flex).toEqual({
      xs: "0 0 auto",
      lg: "1 1 520px",
    });
    expect(finishedIssueHeaderControlsSx.width).toEqual({
      xs: "100%",
      lg: "auto",
    });
  });
});
