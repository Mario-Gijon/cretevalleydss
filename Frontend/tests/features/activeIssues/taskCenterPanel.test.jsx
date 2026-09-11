import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import TaskCenterPanel from "../../../src/features/activeIssues/components/TaskCenterPanel.jsx";
import { renderWithProviders } from "../../setup/renderWithProviders.jsx";

const panelProps = {
  isSmDown: true,
  resolvedHeight: "auto",
  resolvedMaxHeight: "none",
  minHeight: 260,
  total: 1,
  taskType: "all",
  setTaskType: () => {},
  options: [{ value: "all", label: "All" }],
  groupsFiltered: [],
  openItem: () => {},
};

describe("TaskCenterPanel", () => {
  it("keeps the panel header by default", () => {
    renderWithProviders(<TaskCenterPanel {...panelProps} />);

    expect(screen.getByText("Tasks", { exact: true })).toBeVisible();
  });

  it("can suppress the panel header while preserving task controls", () => {
    renderWithProviders(<TaskCenterPanel {...panelProps} showHeader={false} />);

    expect(screen.queryByText("Tasks", { exact: true })).not.toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeVisible();
  });
});
