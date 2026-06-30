import { screen } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../../src/features/admin/experts/AdminExpertsSection.jsx", () => ({
  default: () => <div>experts section</div>,
}));

vi.mock("../../../src/features/admin/issues/AdminIssuesSection.jsx", () => ({
  default: () => <div>issues section</div>,
}));

vi.mock("../../../src/features/admin/models/AdminModelsSection.jsx", () => ({
  default: () => <div>models section</div>,
}));

vi.mock("../../../src/features/admin/modelForge/AdminModelForgeSection.jsx", () => ({
  default: () => <div>model forge section</div>,
}));

vi.mock("../../../src/features/admin/reports/AdminReportsSection.jsx", () => ({
  default: () => <div>reports section</div>,
}));

vi.mock("../../../src/features/admin/logs/AdminLogsSection.jsx", () => ({
  default: () => <div>logs section</div>,
}));

import AdminView from "../../../src/features/admin/AdminView.jsx";
import { renderWithProviders } from "../../setup/renderWithProviders.jsx";

const renderAdminView = (route) =>
  renderWithProviders(
    <Routes>
      <Route path="/dashboard/admin/*" element={<AdminView />} />
    </Routes>,
    { route }
  );

describe("AdminView", () => {
  it("renders the admin home on the index route", async () => {
    renderAdminView("/dashboard/admin");

    expect(await screen.findByText("Admin panel")).toBeInTheDocument();
    expect(screen.getByText("Models")).toBeInTheDocument();
  });

  it("renders the models route inside the admin shell", async () => {
    renderAdminView("/dashboard/admin/models");

    expect(await screen.findByText("models section")).toBeInTheDocument();
    expect(screen.getByText("Manage decision models and their parameters.")).toBeInTheDocument();
  });

  it("redirects unknown admin subroutes to /dashboard/admin", async () => {
    renderAdminView("/dashboard/admin/unknown");

    expect(await screen.findByText("Admin panel")).toBeInTheDocument();
    expect(screen.queryByText("models section")).not.toBeInTheDocument();
  });

  it("route shells do not crash for other admin sections", async () => {
    renderAdminView("/dashboard/admin/reports");

    expect(await screen.findByText("reports section")).toBeInTheDocument();
    expect(screen.getByText("Usage and activity summaries.")).toBeInTheDocument();
  });
});
