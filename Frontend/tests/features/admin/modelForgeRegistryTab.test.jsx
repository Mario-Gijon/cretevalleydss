import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ModelForgeRegistryTab from "../../../src/features/admin/modelForge/ModelForgeRegistryTab.jsx";
import { renderWithProviders } from "../../setup/renderWithProviders.jsx";

describe("ModelForgeRegistryTab", () => {
  it("renders the expression-domain type usage breakdown", async () => {
    renderWithProviders(
      <ModelForgeRegistryTab
        assets={{
          expressionDomainTypes: [
            {
              kind: "expressionDomainType",
              key: "linguisticTwoTupleScale",
              origin: "generated",
              locations: ["Frontend/src/features/expressionDomains/types"],
              missingLocations: [],
              usageCount: 6,
              usageBreakdown: {
                expressionDomains: 1,
                issueExpressionDomainSnapshots: 2,
                issueModels: 3,
              },
              deletable: false,
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

    expect(await screen.findByText("Expression domain types")).toBeInTheDocument();
    expect(screen.getByText("linguisticTwoTupleScale")).toBeInTheDocument();
    expect(screen.getByText("6")).toBeInTheDocument();
    expect(screen.getByText(/Domains: 1/)).toBeInTheDocument();
    expect(screen.getByText(/Snapshots: 2/)).toBeInTheDocument();
    expect(screen.getByText(/Models: 3/)).toBeInTheDocument();
  });
});
