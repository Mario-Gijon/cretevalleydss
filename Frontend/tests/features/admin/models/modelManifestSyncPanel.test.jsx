import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../../src/services/admin.service", () => ({
  getAdminModelCatalog: vi.fn(),
  getModelManifestDryRun: vi.fn(),
  syncModelManifest: vi.fn(),
  updateModelCatalogVisibility: vi.fn(),
}));

vi.mock(
  "../../../../src/features/admin/models/components/ModelCatalogTab.jsx",
  () => ({
    default: ({
      rows,
      loadingCatalog,
      catalogError,
      onViewDetails,
      onAskVisibilityChange,
    }) => (
      <div>
        <div>catalog tab</div>
        <div>{loadingCatalog ? "catalog loading" : "catalog loaded"}</div>
        <div>{catalogError || "no catalog error"}</div>
        {rows.map((row) => (
          <div key={row.mongoId || row.apiModelKey || row.displayName}>
            <span>{`${row.displayName}|${row.syncState}`}</span>
            <button type="button" onClick={() => onViewDetails(row)}>
              {`view-${row.displayName}`}
            </button>
            <button type="button" onClick={() => onAskVisibilityChange(row)}>
              {`visibility-${row.displayName}`}
            </button>
          </div>
        ))}
      </div>
    ),
  })
);

vi.mock(
  "../../../../src/features/admin/models/components/ModelManifestSyncTab.jsx",
  () => ({
    default: ({
      report,
      syncResult,
      loadingDryRun,
      loadingSync,
      onRunDryRun,
      onAskSync,
      errorMessage,
    }) => (
      <div>
        <div>manifest sync tab</div>
        <div>{report ? "dry-run-loaded" : "dry-run-empty"}</div>
        <div>{syncResult ? "sync-result-loaded" : "sync-result-empty"}</div>
        <div>{loadingDryRun ? "dry-run-loading" : "dry-run-idle"}</div>
        <div>{loadingSync ? "sync-loading" : "sync-idle"}</div>
        <div>{errorMessage || "no sync error"}</div>
        <button type="button" onClick={onRunDryRun}>
          run dry-run
        </button>
        <button type="button" onClick={onAskSync}>
          request sync
        </button>
      </div>
    ),
  })
);

vi.mock(
  "../../../../src/features/admin/models/components/ModelManifestReviewTab.jsx",
  () => ({
    default: ({ report }) => (
      <div>{report ? "review loaded" : "review empty"}</div>
    ),
  })
);

vi.mock(
  "../../../../src/features/admin/models/components/ModelDetailDialog.jsx",
  () => ({
    default: ({ row, open, onClose }) =>
      open ? (
        <div>
          <div>{`detail:${row.displayName}`}</div>
          <button type="button" onClick={onClose}>
            close detail
          </button>
        </div>
      ) : null,
  })
);

import ModelManifestSyncPanel from "../../../../src/features/admin/models/ModelManifestSyncPanel.jsx";
import {
  getAdminModelCatalog,
  getModelManifestDryRun,
  syncModelManifest,
  updateModelCatalogVisibility,
} from "../../../../src/services/admin.service";
import { renderWithProviders } from "../../../setup/renderWithProviders.jsx";
import {
  buildAdminCatalogModelsFixture,
  buildAdminDryRunModernReportFixture,
  buildAdminSyncResultFixture,
} from "../../../mocks/fixtures/adminModels.fixtures.js";

const LocationProbe = () => {
  const location = useLocation();
  return <div>{`${location.pathname}${location.search}`}</div>;
};

const renderPanel = ({
  route = "/dashboard/admin/models",
  snackbarValue = {},
} = {}) =>
  renderWithProviders(
    <Routes>
      <Route
        path="/dashboard/admin/models"
        element={
          <>
            <ModelManifestSyncPanel />
            <LocationProbe />
          </>
        }
      />
    </Routes>,
    { route, snackbarValue }
  );

describe("ModelManifestSyncPanel", () => {
  const showSnackbarAlert = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
    getAdminModelCatalog.mockResolvedValue({
      success: true,
      data: { models: buildAdminCatalogModelsFixture() },
    });
    getModelManifestDryRun.mockResolvedValue({
      success: true,
      message: "Dry-run completed",
      data: buildAdminDryRunModernReportFixture(),
    });
    syncModelManifest.mockResolvedValue({
      success: true,
      message: "Manifest synchronized",
      data: buildAdminSyncResultFixture(),
    });
    updateModelCatalogVisibility.mockResolvedValue({
      success: true,
      message: "Visibility updated",
    });
  });

  it("defaults to the catalog tab and replaces invalid tab params", async () => {
    renderPanel({
      route: "/dashboard/admin/models?tab=invalid",
      snackbarValue: { showSnackbarAlert },
    });

    expect(await screen.findByText("catalog tab")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText("/dashboard/admin/models?tab=catalog")).toBeInTheDocument()
    );
  });

  it("updates search params when selecting catalog, manifest sync, and review tabs", async () => {
    const user = userEvent.setup();
    renderPanel({ snackbarValue: { showSnackbarAlert } });

    expect(await screen.findByText("catalog tab")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Manifest Sync" }));
    await waitFor(() =>
      expect(
        screen.getByText("/dashboard/admin/models?tab=manifest-sync")
      ).toBeInTheDocument()
    );
    expect(screen.getByText("manifest sync tab")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Review" }));
    await waitFor(() =>
      expect(screen.getByText("/dashboard/admin/models?tab=review")).toBeInTheDocument()
    );
    expect(screen.getByText("review empty")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Catalog" }));
    await waitFor(() =>
      expect(screen.getByText("/dashboard/admin/models?tab=catalog")).toBeInTheDocument()
    );
    expect(screen.getByText("catalog tab")).toBeInTheDocument();
  });

  it("shows a pending success message once and removes it from sessionStorage", async () => {
    window.sessionStorage.setItem(
      "system.pendingSuccessMessage",
      "Pending admin success"
    );

    renderPanel({ snackbarValue: { showSnackbarAlert } });

    await screen.findByText("catalog tab");
    await waitFor(() =>
      expect(showSnackbarAlert).toHaveBeenCalledWith(
        "Pending admin success",
        "success"
      )
    );
    expect(window.sessionStorage.getItem("system.pendingSuccessMessage")).toBeNull();
  });

  it("passes normalized and dry-run-merged rows to the catalog tab", async () => {
    getModelManifestDryRun.mockResolvedValueOnce({
      success: true,
      message: "Dry-run completed",
      data: buildAdminDryRunModernReportFixture(),
    });

    const user = userEvent.setup();
    renderPanel({ snackbarValue: { showSnackbarAlert } });

    await screen.findByText("catalog tab");
    await user.click(screen.getByRole("tab", { name: "Manifest Sync" }));
    await user.click(screen.getByRole("button", { name: "run dry-run" }));
    await user.click(screen.getByRole("tab", { name: "Catalog" }));

    await waitFor(() =>
      expect(
        screen.getByText("Budget Optimizer 10|Has differences")
      ).toBeInTheDocument()
    );
    expect(screen.getByText("Weights Builder|Available")).toBeInTheDocument();
    expect(screen.getByText("Unknown model|Missing from manifest")).toBeInTheDocument();
  });

  it("runs dry-run, shows review data, confirms sync, and closes the sync dialog on success", async () => {
    const user = userEvent.setup();
    renderPanel({ snackbarValue: { showSnackbarAlert } });

    await screen.findByText("catalog tab");
    await user.click(screen.getByRole("tab", { name: "Manifest Sync" }));
    await user.click(screen.getByRole("button", { name: "run dry-run" }));

    await waitFor(() => expect(getModelManifestDryRun).toHaveBeenCalledTimes(1));
    expect(screen.getByText("dry-run-loaded")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Review" }));
    expect(await screen.findByText("review loaded")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Manifest Sync" }));
    await user.click(screen.getByRole("button", { name: "request sync" }));
    expect(
      await screen.findByRole("heading", { name: "Synchronize model catalog?" })
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() =>
      expect(
        screen.queryByRole("heading", { name: "Synchronize model catalog?" })
      ).not.toBeInTheDocument()
    );

    await user.click(screen.getByRole("button", { name: "request sync" }));
    await user.click(screen.getByRole("button", { name: "Synchronize" }));

    await waitFor(() => expect(syncModelManifest).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(
        screen.queryByRole("heading", { name: "Synchronize model catalog?" })
      ).not.toBeInTheDocument()
    );
    await waitFor(() =>
      expect(showSnackbarAlert).toHaveBeenCalledWith(
        "Manifest synchronized",
        "success"
      )
    );
  });

  it("opens and closes the detail dialog safely", async () => {
    const user = userEvent.setup();
    renderPanel({ snackbarValue: { showSnackbarAlert } });

    await screen.findByText("catalog tab");
    await user.click(screen.getByRole("button", { name: "view-Budget Optimizer 10" }));

    expect(await screen.findByText("detail:Budget Optimizer 10")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "close detail" }));
    await waitFor(() =>
      expect(screen.queryByText("detail:Budget Optimizer 10")).not.toBeInTheDocument()
    );
  });

  it("opens the visibility confirm dialog, warns on scaffold enable, and closes on success", async () => {
    const user = userEvent.setup();
    renderPanel({ snackbarValue: { showSnackbarAlert } });

    await screen.findByText("catalog tab");
    await user.click(screen.getByRole("button", { name: "visibility-Weights Builder" }));

    expect(await screen.findByRole("heading", { name: "Enable model?" })).toBeInTheDocument();
    expect(
      screen.getAllByText(
        "This model is marked as scaffold. It may return MODEL_UNDER_DEVELOPMENT until implemented."
      ).length
    ).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "Enable" }));

    await waitFor(() =>
      expect(updateModelCatalogVisibility).toHaveBeenCalledWith(
        "mongo-criteria-model",
        { visibleInCriteriaWeighting: true }
      )
    );
    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: "Enable model?" })).not.toBeInTheDocument()
    );
  });

  it("renders loading and error states from catalog hooks without crashing", async () => {
    getAdminModelCatalog.mockResolvedValueOnce({
      success: false,
      message: "Error fetching model catalog",
    });

    renderPanel({ snackbarValue: { showSnackbarAlert } });

    expect(await screen.findByText("catalog tab")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText("Error fetching model catalog")).toBeInTheDocument()
    );
  });
});
