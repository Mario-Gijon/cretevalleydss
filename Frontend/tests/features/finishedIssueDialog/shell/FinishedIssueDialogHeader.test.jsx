import { ThemeProvider, createTheme } from "@mui/material/styles";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const contextValue = vi.hoisted(() => ({
  dialog: { payload: { issue: { name: "Completed issue" } } },
  selectedIssue: null,
  setOpenRemoveConfirmDialog: vi.fn(),
  handleCloseFinishedIssueDialog: vi.fn(),
  header: {
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
  contextValue.header.showRounds = false;
  contextValue.header.basePhases = [];
  contextValue.header.selectedPhase = 0;
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
  it("keeps only issue actions on desktop", () => {
    renderHeader();

    expect(screen.queryByLabelText("Select execution")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Add model")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Remove issue")).toBeInTheDocument();
    expect(screen.getByLabelText("Close Finished Issue")).toBeInTheDocument();
    expect(screen.queryByLabelText("Open issue actions")).not.toBeInTheDocument();
  });

  it("provides only issue actions on mobile and closes the menu after each action", () => {
    mobile = true;
    renderHeader();
    const actionsButton = screen.getByLabelText("Open issue actions");
    expect(screen.queryByTestId("TaskAltIcon")).not.toBeInTheDocument();

    fireEvent.click(actionsButton);
    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.queryByText("Base")).not.toBeInTheDocument();
    expect(screen.queryByText("Scenario")).not.toBeInTheDocument();
    expect(screen.queryByText("Add model")).not.toBeInTheDocument();
    expect(screen.getByText("Remove issue")).toBeInTheDocument();
    expect(screen.getByText("Close dialog")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Remove issue"));
    expect(contextValue.setOpenRemoveConfirmDialog).toHaveBeenCalledWith(true);

    fireEvent.click(actionsButton);
    fireEvent.click(screen.getByText("Close dialog"));
    expect(contextValue.handleCloseFinishedIssueDialog).toHaveBeenCalledOnce();
  });

  it("shows real consensus phase tabs independently of model selection", () => {
    contextValue.header.showRounds = true;
    contextValue.header.basePhases = [0, 1, 5];
    contextValue.header.selectedPhase = 5;
    renderHeader();

    expect(screen.getByRole("tab", { name: "Initial" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Round 1" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Final/ })).toBeInTheDocument();
  });
});
