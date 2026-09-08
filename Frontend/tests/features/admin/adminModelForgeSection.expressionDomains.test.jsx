import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../../src/services/admin.service.js", () => ({
  getBackendHealth: vi.fn(),
  getModelForgeAssetsAdmin: vi.fn(async () => ({ success: true, data: {} })),
  getModelForgeCatalog: vi.fn(async () => ({
    success: true,
    data: { evaluationStructures: [], parameterStructures: [] },
  })),
  previewModelForgeModelPackage: vi.fn(),
}));

import AdminModelForgeSection from "../../../src/features/admin/modelForge/AdminModelForgeSection.jsx";
import { renderWithProviders } from "../../setup/renderWithProviders.jsx";

describe("AdminModelForgeSection expression-domain restrictions", () => {
  it("shows typed compatibility controls instead of the JSON editor", async () => {
    renderWithProviders(<AdminModelForgeSection />, {
      route: "/dashboard/admin/model-forge?tab=generate",
    });

    expect(await screen.findAllByText("Compatibility restrictions")).toHaveLength(2);
    expect(screen.getAllByLabelText("Minimum")).toHaveLength(2);
    expect(screen.getAllByLabelText("Maximum")).toHaveLength(2);
    expect(screen.queryByLabelText("Constraints JSON")).not.toBeInTheDocument();
    expect(screen.queryByText("Constraint template")).not.toBeInTheDocument();
  });
});
