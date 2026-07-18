import { ThemeProvider, createTheme } from "@mui/material/styles";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ModelsOverviewCard from "../../../../../src/features/finishedIssueDialog/sections/dashboard/components/cards/ModelsOverviewCard";
import { buildModelsData, buildModelsPreview } from "../../../../../src/features/finishedIssueDialog/sections/models/logic/buildModelsData.js";
import { buildModelsCardsData, DEFAULT_MODEL_PAPER_URL } from "../../../../../src/features/finishedIssueDialog/sections/models/logic/buildModelsCardsData.js";
import { buildFinishedIssueExecutionOptions, selectFinishedIssueExecution } from "../../../../../src/features/finishedIssueDialog/logic/selectFinishedIssueExecution.js";
import { buildFinishedIssuePayloadFixture } from "../../../../mocks/fixtures/finishedIssueDialog.fixtures.js";

const buildPreview = (description) => {
  const payload = buildFinishedIssuePayloadFixture();
  payload.models.base.description = description;
  return buildModelsPreview(buildModelsData({
    payload,
    selectedExecution: {
      type: "base",
      key: "base",
      label: "Base",
      model: payload.models.base,
    },
  }));
};

const renderCard = (models) => render(
  <ThemeProvider theme={createTheme()}>
    <ModelsOverviewCard models={models} onViewModels={() => {}} />
  </ThemeProvider>
);

describe("buildModelsPreview description normalization", () => {
  it("prefers the canonical short description", () => {
    const preview = buildPreview({ short: "Short model description", extended: "Extended description" });
    expect(preview.selectedModelDescription).toBe("Short model description");
    expect(typeof preview.selectedModelDescription === "string" || preview.selectedModelDescription === null).toBe(true);
  });

  it("falls back to the canonical extended description", () => {
    expect(buildPreview({ short: null, extended: "Extended model description" }).selectedModelDescription).toBe("Extended model description");
  });

  it("returns null when both canonical descriptions are unavailable", () => {
    expect(buildPreview({ short: null, extended: null }).selectedModelDescription).toBeNull();
  });

  it("never renders a canonical description object as a React child", () => {
    renderCard({
      baseModelName: "Base model",
      selectedExecutionLabel: "Base",
      runsGenerated: 0,
      selectedModelDescription: { short: "Malformed object", extended: "" },
      status: "completed",
    });

    expect(screen.queryByText("[object Object]")).not.toBeInTheDocument();
  });

  it("keeps Dashboard Models compact and never exposes raw parameter values", () => {
    renderCard({
      selectedExecutionLabel: "Scenario A",
      selectedModelName: "TOPSIS",
      selectedModelDescription: "Canonical description",
      runsGenerated: 2,
      parameters: { weights: { "criterion-internal-id": 0.5 } },
    });

    expect(screen.getByText("Selected execution")).toBeInTheDocument();
    expect(screen.getByText("Runs generated")).toBeInTheDocument();
    expect(screen.queryByText("Model parameters")).not.toBeInTheDocument();
    expect(screen.queryByText("criterion-internal-id")).not.toBeInTheDocument();
  });

  it("uses the canonical scenario collection for the generated-runs count", () => {
    const payload = buildFinishedIssuePayloadFixture();
    const preview = buildModelsPreview(buildModelsData({
      payload,
      selectedExecution: { type: "base", key: "base", label: "Base", model: payload.models.base },
    }));

    expect(preview.runsGenerated).toBe(payload.scenarios.length);
  });
});

describe("buildModelsCardsData", () => {
  it("uses canonical execution timestamps, paper URLs, and legacy description fallbacks", () => {
    const payload = buildFinishedIssuePayloadFixture();
    payload.models.base.paperUrl = "https://papers.example.test/base";
    payload.scenarios[0].description = "Stored description";
    payload.scenarios[0].computedAt = "2026-01-03T10:00:00.000Z";
    payload.scenarios[0].targetModel.paperUrl = "https://papers.example.test/scenario";
    const base = buildModelsCardsData({ payload, selectedExecution: selectFinishedIssueExecution(payload, "base"), executionOptions: buildFinishedIssueExecutionOptions(payload) });
    const scenario = buildModelsCardsData({ payload, selectedExecution: selectFinishedIssueExecution(payload, "scenario-ok"), executionOptions: buildFinishedIssueExecutionOptions(payload) });

    expect(base.executions[0]).toMatchObject({ computedAt: "2026-01-02T10:00:00.000Z", paperUrl: "https://papers.example.test/base" });
    expect(scenario.executions.find((entry) => entry.key === "scenario-ok")).toMatchObject({ description: "Stored description", computedAt: "2026-01-03T10:00:00.000Z", paperUrl: "https://papers.example.test/scenario" });
    expect(scenario.executions.find((entry) => entry.key === "scenario-error").description).toBe("No scenario description provided.");
    expect(scenario.executions.find((entry) => entry.key === "scenario-error").paperUrl).toBe(DEFAULT_MODEL_PAPER_URL);
  });
});
