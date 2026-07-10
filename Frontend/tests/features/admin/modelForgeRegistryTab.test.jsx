import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ModelForgeRegistryTab from "../../../src/features/admin/modelForge/ModelForgeRegistryTab.jsx";
import { renderWithProviders } from "../../setup/renderWithProviders.jsx";

describe("ModelForgeRegistryTab", () => {
  it("renders remaining generated asset categories without an expression-domain section", async () => {
    renderWithProviders(
      <ModelForgeRegistryTab
        assets={{
          models: [
            {
              kind: "model",
              key: "demo_model",
              locations: ["DecisionModelsService/models/demo_model"],
              missingLocations: [],
              usedByIssuesCount: 0,
              deletable: true,
            },
          ],
        }}
        loading={false}
        error=""
        actionError=""
        onReload={vi.fn()}
        onAskDelete={vi.fn()}
        deleteBusyId=""
      />
    );

    expect(await screen.findByText("Models")).toBeInTheDocument();
    expect(screen.getByText("demo_model")).toBeInTheDocument();
    expect(screen.queryByText("Expression domain types")).not.toBeInTheDocument();
  });
});
