import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SummaryStep } from "../../../src/features/createIssue/summary/SummaryStep.jsx";
import { CreateIssueContext } from "../../../src/features/createIssue/context/createIssue.context.js";
import { renderWithProviders } from "../../setup/renderWithProviders.jsx";

const createIssueContextValue = {
  allData: {
    selectedModel: { name: "Test model", parameters: [] },
    isConsensus: false,
    simulateConsensus: false,
    alternatives: [{ id: "alternative-1", name: "Alternative" }],
    criteria: [{ id: "criterion-1", name: "Criterion", isLeaf: true, children: [] }],
    addedExperts: ["expert@example.test"],
    expressionDomainConfig: {},
    criteriaWeightingConfig: {},
  },
  issueName: "Test issue",
  issueDescription: "A test issue description.",
  issueNameError: false,
  issueDescriptionError: false,
  handleValidateIssueName: vi.fn(),
  handleValidateIssueDescription: vi.fn(),
  closureDate: null,
  setClosureDate: vi.fn(),
  closureDateError: false,
  handleClosureDateError: vi.fn(),
  consensusMaxPhases: null,
  setConsensusMaxPhases: vi.fn(),
  consensusThreshold: 0.8,
  setConsensusThreshold: vi.fn(),
  simulateConsensus: false,
  setSimulateConsensus: vi.fn(),
  paramValues: {},
  setParamValues: vi.fn(),
  defaultModelParams: true,
  setDefaultModelParams: vi.fn(),
  setCriteriaWeightingConfig: vi.fn(),
  expertWeights: {},
};

const renderSummaryStep = (overrides = {}) =>
  renderWithProviders(
    <CreateIssueContext.Provider
      value={{
        ...createIssueContextValue,
        ...overrides,
        allData: { ...createIssueContextValue.allData, ...overrides.allData },
      }}
    >
      <SummaryStep />
    </CreateIssueContext.Provider>
  );

describe("SummaryStep expected finalization date", () => {
  it("labels the optional estimate and explains that it does not finalize the issue automatically", async () => {
    const user = userEvent.setup();
    renderSummaryStep();

    expect(screen.getAllByText("Expected finalization date", { exact: true })).not.toHaveLength(0);
    expect(screen.getByText("Set an expected finalization date.", { exact: true })).toBeInTheDocument();
    expect(screen.queryByText("Closure date", { exact: true })).not.toBeInTheDocument();

    await user.hover(
      screen.getByLabelText(
        "This date is only an estimate. The issue will not be finalized automatically when it is reached."
      )
    );

    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "This date is only an estimate. The issue will not be finalized automatically when it is reached."
    );
  });

  it("mentions the consensus threshold when the issue uses consensus", () => {
    renderSummaryStep({ allData: { isConsensus: true } });

    expect(
      screen.getByText(
        "Set an expected finalization date and the consensus threshold.",
        { exact: true }
      )
    ).toBeInTheDocument();
    expect(screen.getByText("Max consensus rounds", { exact: true })).toBeInTheDocument();
    expect(screen.queryByText("NºMax consensus rounds", { exact: true })).not.toBeInTheDocument();
    expect(screen.queryByText("Set an expected finalization date.", { exact: true })).not.toBeInTheDocument();
  });
});
