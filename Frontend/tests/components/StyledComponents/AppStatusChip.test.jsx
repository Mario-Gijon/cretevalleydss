import { render, screen } from "@testing-library/react";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import { describe, expect, it } from "vitest";

import AppStatusChip from "../../../src/components/StyledComponents/AppStatusChip.jsx";

describe("AppStatusChip", () => {
  it.each([
    ["Confirmed", "success", "success"],
    ["Pending", "warning", "warning"],
    ["Failed", "error", "error"],
    ["Informational", "info", "secondary"],
    ["Secondary", "secondary", "secondary"],
    ["Unknown", "unexpected", "secondary"],
  ])("renders %s with the %s tone", (label, tone, expectedTone) => {
    render(<AppStatusChip label={label} tone={tone} />);

    const chip = screen.getByText(label).parentElement;
    expect(chip).toHaveAttribute("data-status-tone", expectedTone);
  });

  it("renders an optional contextual icon", () => {
    render(<AppStatusChip label="Confirmed" tone="success" icon={<CheckCircleOutlineIcon data-testid="status-icon" />} />);

    expect(screen.getByTestId("status-icon")).toBeInTheDocument();
  });
});
