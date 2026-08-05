import { ThemeProvider, createTheme } from "@mui/material/styles";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const contextValue = vi.hoisted(() => ({
  dialog: { payload: { issue: { name: "Completed issue" } } },
  selectedIssue: null,
  setOpenRemoveConfirmDialog: vi.fn(),
  handleCloseFinishedIssueDialog: vi.fn(),
  header: {
    executionOptions: [
      { key: "base", type: "base", label: "Base", modelName: "Base model" },
      { key: "scenario", type: "scenario", label: "Scenario", modelName: "TOPSIS" },
    ],
    selectedExecutionKey: "base",
    selectExecution: vi.fn(),
    openAddScenario: vi.fn(),
    showRounds: false,
    selectedPhase: 0,
    changePhase: vi.fn(),
    basePhases: [],
  },
  navigation: {},
}));

vi.mock("../../../../src/features/finishedIssueDialog/context/finishedIssueDialog.context", () => ({
  useFinishedIssueDialogContext: () => contextValue,
}));
vi.mock("../../../../src/features/finishedIssueDialog/shell/FinishedIssueNavigation", () => ({
  default: () => <div>Navigation</div>,
}));

import FinishedIssueDialogHeader from "../../../../src/features/finishedIssueDialog/shell/FinishedIssueDialogHeader.jsx";

let mobile = false;
const originalMatchMedia = window.matchMedia;

const renderHeader = () => render(<ThemeProvider theme={createTheme()}><FinishedIssueDialogHeader /></ThemeProvider>);

beforeEach(() => {
  vi.clearAllMocks();
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches: mobile,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
  }));
});

afterEach(() => {
  mobile = false;
  window.matchMedia = originalMatchMedia;
});

describe("FinishedIssueDialogHeader", () => {
  it("keeps execution and action controls on desktop", () => {
    renderHeader();

    expect(screen.getByLabelText("Select execution")).toBeInTheDocument();
    expect(screen.getByLabelText("Add model")).toBeInTheDocument();
    expect(screen.getByLabelText("Remove issue")).toBeInTheDocument();
    expect(screen.getByLabelText("Close Finished Issue")).toBeInTheDocument();
    expect(screen.queryByLabelText("Open issue actions")).not.toBeInTheDocument();
  });

  it("provides compact mobile actions and closes the menu after each action", () => {
    mobile = true;
    renderHeader();
    const actionsButton = screen.getByLabelText("Open issue actions");
    expect(screen.queryByTestId("TaskAltIcon")).not.toBeInTheDocument();

    fireEvent.click(actionsButton);
    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getByText("Base")).toBeInTheDocument();
    expect(screen.getByText("Scenario")).toBeInTheDocument();
    expect(screen.getByText("Add model")).toBeInTheDocument();
    expect(screen.getByText("Remove issue")).toBeInTheDocument();
    expect(screen.getByText("Close dialog")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Scenario"));
    expect(contextValue.header.selectExecution).toHaveBeenCalledWith("scenario");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    fireEvent.click(actionsButton);
    fireEvent.click(screen.getByText("Add model"));
    expect(contextValue.header.openAddScenario).toHaveBeenCalledOnce();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    fireEvent.click(actionsButton);
    fireEvent.click(screen.getByText("Remove issue"));
    expect(contextValue.setOpenRemoveConfirmDialog).toHaveBeenCalledWith(true);

    fireEvent.click(actionsButton);
    fireEvent.click(screen.getByText("Close dialog"));
    expect(contextValue.handleCloseFinishedIssueDialog).toHaveBeenCalledOnce();
  });
});
