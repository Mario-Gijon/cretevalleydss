import { ThemeProvider, createTheme } from "@mui/material/styles";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ModelsOverviewCard from "../../../../../src/features/finishedIssueDialog/sections/dashboard/components/cards/ModelsOverviewCard";
import { buildModelsData, buildModelsPreview } from "../../../../../src/features/finishedIssueDialog/sections/models/logic/buildModelsData.js";
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
      additionalRunsCount: 0,
      selectedModelDescription: { short: "Malformed object", extended: "" },
      status: "completed",
      parameters: {},
    });

    expect(screen.queryByText("[object Object]")).not.toBeInTheDocument();
  });
});
