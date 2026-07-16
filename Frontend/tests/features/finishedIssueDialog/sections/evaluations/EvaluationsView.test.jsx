import { ThemeProvider, createTheme } from "@mui/material/styles";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const rendererSpy = vi.hoisted(() => vi.fn());

vi.mock("react-chartjs-2", () => ({
  Doughnut: () => <div data-testid="evaluation-participation-chart" />,
}));

vi.mock("../../../../../src/features/issueEvaluation/components/EvaluationStructureRenderer.jsx", () => ({
  default: (props) => {
    rendererSpy(props);
    return <div data-testid={`evaluation-renderer-${props.stage}`} />;
  },
}));

import EvaluationsView from "../../../../../src/features/finishedIssueDialog/sections/evaluations/components/EvaluationsView.jsx";
import { buildEvaluationsWorkspaceData } from "../../../../../src/features/finishedIssueDialog/sections/evaluations/logic/buildEvaluationsWorkspaceData.js";
import { evaluationPluginPanelSx } from "../../../../../src/features/finishedIssueDialog/sections/evaluations/evaluations.styles.js";
import { buildFinishedIssuePayloadFixture } from "../../../../mocks/fixtures/finishedIssueDialog.fixtures.js";

const actions = {
  setSelectedConsensusPhase: vi.fn(),
  setSelectedCriteriaExpertId: vi.fn(),
  setSelectedAlternativeExpertId: vi.fn(),
  setShowCollective: vi.fn(),
};

const selection = {
  selectedConsensusPhase: 5,
  selectedCriteriaExpertId: "expert-1",
  selectedAlternativeExpertId: "expert-1",
  showCollective: false,
};

const renderView = (data, state = selection) => render(
  <ThemeProvider theme={createTheme()}><EvaluationsView data={data} state={state} actions={actions} /></ThemeProvider>
);

describe("EvaluationsView", () => {
  beforeEach(() => {
    rendererSpy.mockClear();
  });

  it("renders both stored stages independently through registered read-only renderers", () => {
    const data = buildEvaluationsWorkspaceData({ payload: buildFinishedIssuePayloadFixture(), selection });
    renderView(data);

    expect(screen.getByRole("heading", { name: "Criteria weighting" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Alternative evaluation" })).toBeInTheDocument();
    expect(screen.getByLabelText("Consensus round")).toBeInTheDocument();
    expect(screen.getByLabelText("Show collective values")).toBeInTheDocument();
    expect(rendererSpy).toHaveBeenCalledWith(expect.objectContaining({ stage: "criteriaWeighting", readOnly: true, collectivePayload: null }));
    expect(rendererSpy).toHaveBeenCalledWith(expect.objectContaining({ stage: "alternativeEvaluation", readOnly: true, collectivePayload: null }));
  });

  it("keeps collective payloads stage-specific and only supplies them when selected", () => {
    const payload = buildFinishedIssuePayloadFixture();
    const data = buildEvaluationsWorkspaceData({ payload, selection: { ...selection, showCollective: true } });
    renderView(data, { ...selection, showCollective: true });

    expect(rendererSpy).toHaveBeenCalledWith(expect.objectContaining({ stage: "criteriaWeighting", collectivePayload: { weights: true } }));
    expect(rendererSpy).toHaveBeenCalledWith(expect.objectContaining({ stage: "alternativeEvaluation", collectivePayload: { collectiveDisplay: true } }));
  });

  it("hides criteria weighting and expands alternative evaluation when no stored weighting evidence exists", () => {
    const payload = buildFinishedIssuePayloadFixture();
    payload.evaluations.individual = payload.evaluations.individual.filter((entry) => entry.stage !== "criteriaWeighting");
    payload.evaluations.collective = payload.evaluations.collective.filter((entry) => entry.stage !== "criteriaWeighting");
    payload.evaluations.contexts = payload.evaluations.contexts.filter((entry) => entry.stage !== "criteriaWeighting");
    const data = buildEvaluationsWorkspaceData({ payload, selection });
    renderView(data);

    expect(screen.queryByRole("heading", { name: "Criteria weighting" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Alternative evaluation" })).toBeInTheDocument();
    expect(evaluationPluginPanelSx(true)).toMatchObject({ gridColumn: "1 / -1" });
  });

  it("does not render a fake round selector for non-consensus evidence", () => {
    const payload = buildFinishedIssuePayloadFixture();
    payload.consensus.enabled = false;
    const data = buildEvaluationsWorkspaceData({ payload, selection: { ...selection, selectedConsensusPhase: null } });
    renderView(data, { ...selection, selectedConsensusPhase: null });

    expect(screen.queryByLabelText("Consensus round")).not.toBeInTheDocument();
    expect(screen.queryByText("Round 0")).not.toBeInTheDocument();
    expect(screen.queryByText("Phase 0")).not.toBeInTheDocument();
  });
});
