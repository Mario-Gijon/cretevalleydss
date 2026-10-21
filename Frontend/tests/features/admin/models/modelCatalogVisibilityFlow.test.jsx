import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSnackbarContext = vi.hoisted(() => vi.fn());
const mockPersistedVisibility = vi.hoisted(() => ({ value: false }));

vi.mock(
  "../../../../src/context/snackbarAlert/snackbarAlert.context",
  async (importOriginal) => {
    const actual = await importOriginal();
    return {
      ...actual,
      useSnackbarAlertContext: mockSnackbarContext,
    };
  }
);

vi.mock("../../../../src/services/admin.service", () => ({
  getAdminModelCatalog: vi.fn(),
  getModelManifestDryRun: vi.fn(),
  syncModelManifest: vi.fn(),
  updateModelCatalogVisibility: vi.fn(),
}));

import ModelsTable from "../../../../src/features/admin/models/components/ModelsTable.jsx";
import useAdminModelCatalog from "../../../../src/features/admin/models/hooks/useAdminModelCatalog.js";
import useModelManifestActions from "../../../../src/features/admin/models/hooks/useModelManifestActions.js";
import { normalizeModelCatalogRows } from "../../../../src/features/admin/models/logic/buildModelManifestRows.js";
import {
  getAdminModelCatalog,
  updateModelCatalogVisibility,
} from "../../../../src/services/admin.service.js";

const TOPSIS_MODEL_ID = "65f000000000000000000016";

const buildTopsisModel = (visibleInIssueCreation) => ({
  id: TOPSIS_MODEL_ID,
  name: "TOPSIS-Sort 2016",
  apiModelKey: "topsis_sort_2016",
  modelKind: "issue",
  implementationStatus: "ready",
  publicUsable: true,
  issueExecutionAuthorized: true,
  visibleInIssueCreation,
  visibleInCriteriaWeighting: false,
  manifestSync: { isStale: false, lastSyncedAt: "2026-10-21T10:00:00.000Z" },
});

function AdminCatalogTable() {
  const catalog = useAdminModelCatalog();
  const actions = useModelManifestActions({
    onCatalogShouldRefresh: catalog.loadCatalog,
    onCatalogModelUpdated: catalog.applyCatalogModel,
  });

  return (
    <ModelsTable
      rows={normalizeModelCatalogRows(catalog.catalogModels)}
      onViewDetails={() => {}}
      onAskVisibilityChange={actions.updateVisibility}
      visibilityBusyId={actions.visibilityBusyId}
    />
  );
}

describe("admin model visibility flow", () => {
  const showSnackbarAlert = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockPersistedVisibility.value = false;
    mockSnackbarContext.mockReturnValue({ showSnackbarAlert });
    getAdminModelCatalog.mockImplementation(async () => ({
      success: true,
      data: { models: [buildTopsisModel(mockPersistedVisibility.value)] },
    }));
    updateModelCatalogVisibility.mockImplementation(async (modelId, update) => {
      mockPersistedVisibility.value = update.visibleInIssueCreation;
      return {
        success: true,
        message: "Model catalog visibility updated successfully",
        data: { model: buildTopsisModel(mockPersistedVisibility.value) },
      };
    });
  });

  it("shows Enabled after a verified refresh, then Disabled after the reverse cycle", async () => {
    const user = userEvent.setup();
    render(<AdminCatalogTable />);

    expect(await screen.findByText("Disabled")).toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: "Activate model" }));

    expect(await screen.findByText("Enabled")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Deactivate model" })).toBeChecked();
    expect(updateModelCatalogVisibility).toHaveBeenNthCalledWith(1, TOPSIS_MODEL_ID, {
      visibleInIssueCreation: true,
    });

    await user.click(screen.getByRole("checkbox", { name: "Deactivate model" }));

    await waitFor(() => expect(screen.getByText("Disabled")).toBeInTheDocument());
    expect(screen.getByRole("checkbox", { name: "Activate model" })).not.toBeChecked();
    expect(updateModelCatalogVisibility).toHaveBeenNthCalledWith(2, TOPSIS_MODEL_ID, {
      visibleInIssueCreation: false,
    });
    expect(getAdminModelCatalog).toHaveBeenCalledTimes(3);
  });
});
