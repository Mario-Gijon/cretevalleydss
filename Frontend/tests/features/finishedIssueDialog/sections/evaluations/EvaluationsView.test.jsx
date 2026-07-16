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
import {
  evaluationPluginPanelSx,
  evaluationPluginRendererViewportSx,
} from "../../../../../src/features/finishedIssueDialog/sections/evaluations/evaluations.styles.js";
import { buildFinishedIssuePayloadFixture } from "../../../../mocks/fixtures/finishedIssueDialog.fixtures.js";

const actions = {
  setSelectedConsensusPhase: vi.fn(),
  setSelectedExpertId: vi.fn(),
  setShowCollective: vi.fn(),
};

const selection = {
  selectedConsensusPhase: 5,
  selectedExpertId: "expert-1",
  showCollective: false,
};

const renderView = (data, state = selection) => render(
  <ThemeProvider theme={createTheme()}>
    <EvaluationsView data={data} state={state} actions={actions} />
  </ThemeProvider>
);

const payloadWithPartialParticipation = () => {
  const payload = buildFinishedIssuePayloadFixture();
  payload.participants.push(
    {
      id: "p-3",
      expert: { id: "expert-3", name: "Alternative only", email: "alternative@example.test" },
      invitationStatus: "accepted",
    },
    {
      id: "p-4",
      expert: { id: "expert-4", name: "Criteria only", email: "criteria@example.test" },
      invitationStatus: "declined",
    }
  );
  payload.evaluations.individual.push(
    {
      id: "eval-a-3",
      expertId: "expert-3",
      stage: "alternativeEvaluation",
      phase: 5,
      rawPayload: { alternativeOnly: true },
      completed: true,
      submittedAt: "2026-01-04T00:00:00.000Z",
      contextId: "alternativeEvaluation:5",
    },
    {
      id: "eval-c-4",
      expertId: "expert-4",
      stage: "criteriaWeighting",
      phase: 1,
      rawPayload: { criteriaOnly: true },
      completed: true,
      submittedAt: "2026-01-03T00:00:00.000Z",
      contextId: "criteriaWeighting:1",
    }
  );
  return payload;
};

describe("EvaluationsView", () => {
  beforeEach(() => {
    rendererSpy.mockClear();
    Object.values(actions).forEach((action) => action.mockClear());
  });

  it("renders one shared expert selector and both registered read-only renderers", () => {
    const data = buildEvaluationsWorkspaceData({
      payload: buildFinishedIssuePayloadFixture(),
      selection,
    });
    renderView(data);

    expect(screen.getByRole("heading", { name: "Criteria weighting" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Alternative evaluation" })).toBeInTheDocument();
    expect(screen.getAllByLabelText("Expert")).toHaveLength(1);
    expect(screen.getByLabelText("Consensus round")).toBeInTheDocument();
    expect(screen.getByLabelText("Show collective values")).toBeInTheDocument();
    expect(rendererSpy).toHaveBeenCalledWith(expect.objectContaining({ stage: "criteriaWeighting", readOnly: true, collectivePayload: null }));
    expect(rendererSpy).toHaveBeenCalledWith(expect.objectContaining({ stage: "alternativeEvaluation", readOnly: true, collectivePayload: null }));
  });

  it("uses the union of stored submitters and keeps partial-stage experts factual", () => {
    const payload = payloadWithPartialParticipation();
    const data = buildEvaluationsWorkspaceData({
      payload,
      selection: { ...selection, selectedExpertId: "expert-4" },
    });
    renderView(data, { ...selection, selectedExpertId: "expert-4" });

    expect(data.expertOptions.map((expert) => expert.id)).toEqual([
      "expert-1",
      "expert-3",
      "expert-4",
    ]);
    expect(screen.getByText("This expert did not submit an alternative evaluation in this context.")).toBeInTheDocument();
    expect(data.alternativeEvaluation.individual).toBeNull();
    expect(rendererSpy).not.toHaveBeenCalledWith(expect.objectContaining({
      stage: "alternativeEvaluation",
      backendPayload: expect.anything(),
    }));
    expect(screen.getByRole("heading", { name: "Criteria weighting" })).toBeInTheDocument();
    expect(screen.getByText("Alternative only")).toBeInTheDocument();
    expect(screen.getByText("Criteria only")).toBeInTheDocument();
  });

  it("keeps collective payloads stage-specific and only supplies them when selected", () => {
    const payload = buildFinishedIssuePayloadFixture();
    const data = buildEvaluationsWorkspaceData({
      payload,
      selection: { ...selection, showCollective: true },
    });
    renderView(data, { ...selection, showCollective: true });

    expect(rendererSpy).toHaveBeenCalledWith(expect.objectContaining({ stage: "criteriaWeighting", collectivePayload: { weights: true } }));
    expect(rendererSpy).toHaveBeenCalledWith(expect.objectContaining({ stage: "alternativeEvaluation", collectivePayload: { collectiveDisplay: true } }));
  });

  it("hides criteria weighting and expands alternative evaluation only when the stage has no evidence", () => {
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

  it("renders a compact domain table and content-driven renderer viewport", () => {
    const payload = buildFinishedIssuePayloadFixture();
    payload.criteria.nodes.find((criterion) => criterion.id === "cost").type = "cost";
    payload.criteria.nodes.find((criterion) => criterion.id === "quality").type = "benefit";
    const data = buildEvaluationsWorkspaceData({ payload, selection });
    renderView(data);

    expect(screen.getByRole("table", { name: "Expression domains by criterion" })).toBeInTheDocument();
    expect(screen.getAllByText("Cost")).toHaveLength(2);
    expect(screen.getByText("Quality")).toBeInTheDocument();
    expect(screen.getByText("Benefit")).toBeInTheDocument();
    expect(evaluationPluginRendererViewportSx).not.toHaveProperty("minHeight");
    expect(evaluationPluginRendererViewportSx).toMatchObject({ maxHeight: { xs: 520, xl: 620 }, overflow: "auto" });
  });

  it("does not render a fake round selector for non-consensus evidence", () => {
    const payload = buildFinishedIssuePayloadFixture();
    payload.consensus.enabled = false;
    const data = buildEvaluationsWorkspaceData({
      payload,
      selection: { ...selection, selectedConsensusPhase: null },
    });
    renderView(data, { ...selection, selectedConsensusPhase: null });

    expect(screen.queryByLabelText("Consensus round")).not.toBeInTheDocument();
    expect(screen.getAllByLabelText("Expert")).toHaveLength(1);
    expect(screen.queryByText("Round 0")).not.toBeInTheDocument();
    expect(screen.queryByText("Phase 0")).not.toBeInTheDocument();
  });
});
