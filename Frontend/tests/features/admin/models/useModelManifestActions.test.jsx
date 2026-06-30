import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUseSnackbarAlertContext = vi.hoisted(() => vi.fn());

vi.mock(
  "../../../../src/context/snackbarAlert/snackbarAlert.context",
  async (importOriginal) => {
    const actual = await importOriginal();
    return {
      ...actual,
      useSnackbarAlertContext: mockUseSnackbarAlertContext,
    };
  }
);

vi.mock("../../../../src/services/admin.service", () => ({
  getModelManifestDryRun: vi.fn(),
  syncModelManifest: vi.fn(),
  updateModelCatalogVisibility: vi.fn(),
}));

import useModelManifestActions from "../../../../src/features/admin/models/hooks/useModelManifestActions.js";
import {
  getModelManifestDryRun,
  syncModelManifest,
  updateModelCatalogVisibility,
} from "../../../../src/services/admin.service";
import {
  buildAdminDryRunModernReportFixture,
  buildAdminSyncResultFixture,
} from "../../../mocks/fixtures/adminModels.fixtures.js";

describe("useModelManifestActions", () => {
  const showSnackbarAlert = vi.fn();
  const onAfterSync = vi.fn();
  const onCatalogShouldRefresh = vi.fn().mockResolvedValue(true);

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSnackbarAlertContext.mockReturnValue({ showSnackbarAlert });
  });

  it("stores dry-run results on success", async () => {
    const report = buildAdminDryRunModernReportFixture();
    getModelManifestDryRun.mockResolvedValueOnce({
      success: true,
      message: "Dry-run done",
      data: report,
    });

    const { result } = renderHook(() =>
      useModelManifestActions({ onAfterSync, onCatalogShouldRefresh })
    );

    await act(async () => {
      await result.current.runDryRun();
    });

    expect(getModelManifestDryRun).toHaveBeenCalledTimes(1);
    expect(result.current.dryRunReport).toEqual(report);
    expect(showSnackbarAlert).toHaveBeenCalledWith("Dry-run done", "success");
    await waitFor(() => expect(result.current.loadingDryRun).toBe(false));
  });

  it("handles dry-run failures and thrown errors safely", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    getModelManifestDryRun
      .mockResolvedValueOnce({
        success: false,
        message: "Dry-run failed",
      })
      .mockRejectedValueOnce(new Error("boom"));

    const { result } = renderHook(() =>
      useModelManifestActions({ onAfterSync, onCatalogShouldRefresh })
    );

    await act(async () => {
      await result.current.runDryRun();
    });

    expect(result.current.errorMessage).toBe("Dry-run failed");
    expect(showSnackbarAlert).toHaveBeenCalledWith("Dry-run failed", "error");
    await waitFor(() => expect(result.current.loadingDryRun).toBe(false));

    await act(async () => {
      await result.current.runDryRun();
    });

    expect(result.current.errorMessage).toBe(
      "Unexpected error running model manifest dry-run"
    );
    expect(showSnackbarAlert).toHaveBeenCalledWith(
      "Unexpected error running model manifest dry-run",
      "error"
    );
    await waitFor(() => expect(result.current.loadingDryRun).toBe(false));
    consoleErrorSpy.mockRestore();
  });

  it("stores sync results and calls success callbacks", async () => {
    const syncResult = buildAdminSyncResultFixture();
    syncModelManifest.mockResolvedValueOnce({
      success: true,
      message: "Sync done",
      data: syncResult,
    });

    const { result } = renderHook(() =>
      useModelManifestActions({ onAfterSync, onCatalogShouldRefresh })
    );

    await act(async () => {
      await result.current.syncManifest();
    });

    expect(syncModelManifest).toHaveBeenCalledTimes(1);
    expect(result.current.syncResult).toEqual(syncResult);
    expect(onAfterSync).toHaveBeenCalledTimes(1);
    expect(onCatalogShouldRefresh).toHaveBeenCalledWith({ quiet: true });
    expect(showSnackbarAlert).toHaveBeenCalledWith("Sync done", "success");
    await waitFor(() => expect(result.current.loadingSync).toBe(false));
  });

  it("handles sync failures and thrown errors without success callbacks", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    syncModelManifest
      .mockResolvedValueOnce({
        success: false,
        message: "Sync failed",
      })
      .mockRejectedValueOnce(new Error("boom"));

    const { result } = renderHook(() =>
      useModelManifestActions({ onAfterSync, onCatalogShouldRefresh })
    );

    await act(async () => {
      await result.current.syncManifest();
    });

    expect(result.current.errorMessage).toBe("Sync failed");
    expect(onAfterSync).not.toHaveBeenCalled();
    expect(onCatalogShouldRefresh).not.toHaveBeenCalled();
    expect(showSnackbarAlert).toHaveBeenCalledWith("Sync failed", "error");
    await waitFor(() => expect(result.current.loadingSync).toBe(false));

    await act(async () => {
      await result.current.syncManifest();
    });

    expect(result.current.errorMessage).toBe(
      "Unexpected error synchronizing model manifest"
    );
    expect(showSnackbarAlert).toHaveBeenCalledWith(
      "Unexpected error synchronizing model manifest",
      "error"
    );
    expect(onAfterSync).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it("updates visibility for issue models and refreshes the catalog", async () => {
    updateModelCatalogVisibility.mockResolvedValueOnce({
      success: true,
      message: "Visibility updated",
    });

    const row = {
      mongoId: "mongo-issue-model",
      modelKind: "issue",
      visibleInIssueCreation: true,
    };

    const { result } = renderHook(() =>
      useModelManifestActions({ onAfterSync, onCatalogShouldRefresh })
    );

    await act(async () => {
      await result.current.updateVisibility(row);
    });

    expect(updateModelCatalogVisibility).toHaveBeenCalledWith("mongo-issue-model", {
      visibleInIssueCreation: false,
    });
    expect(onCatalogShouldRefresh).toHaveBeenCalledWith({ quiet: true });
    expect(showSnackbarAlert).toHaveBeenCalledWith("Visibility updated", "success");
    await waitFor(() => expect(result.current.visibilityBusyId).toBeNull());
  });

  it("updates visibility for criteria weighting models using the correct field", async () => {
    updateModelCatalogVisibility.mockResolvedValueOnce({
      success: true,
    });

    const row = {
      mongoId: "mongo-criteria-model",
      modelKind: "criteriaWeighting",
      visibleInIssueCreation: true,
      visibleInCriteriaWeighting: false,
    };

    const { result } = renderHook(() =>
      useModelManifestActions({ onAfterSync, onCatalogShouldRefresh })
    );

    await act(async () => {
      await result.current.updateVisibility(row);
    });

    expect(updateModelCatalogVisibility).toHaveBeenCalledWith("mongo-criteria-model", {
      visibleInCriteriaWeighting: true,
    });
  });

  it("returns false without calling the service when a row has no mongoId", async () => {
    const { result } = renderHook(() =>
      useModelManifestActions({ onAfterSync, onCatalogShouldRefresh })
    );

    let outcome = null;
    await act(async () => {
      outcome = await result.current.updateVisibility({ modelKind: "issue" });
    });

    expect(outcome).toBe(false);
    expect(updateModelCatalogVisibility).not.toHaveBeenCalled();
  });

  it("handles visibility update failures and thrown errors", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    updateModelCatalogVisibility
      .mockResolvedValueOnce({
        success: false,
        message: "Visibility failed",
      })
      .mockRejectedValueOnce(new Error("boom"));

    const row = {
      mongoId: "mongo-issue-model",
      modelKind: "issue",
      visibleInIssueCreation: false,
    };

    const { result } = renderHook(() =>
      useModelManifestActions({ onAfterSync, onCatalogShouldRefresh })
    );

    await act(async () => {
      await result.current.updateVisibility(row);
    });

    expect(result.current.errorMessage).toBe("Visibility failed");
    expect(showSnackbarAlert).toHaveBeenCalledWith("Visibility failed", "error");
    expect(onCatalogShouldRefresh).not.toHaveBeenCalled();
    await waitFor(() => expect(result.current.visibilityBusyId).toBeNull());

    await act(async () => {
      await result.current.updateVisibility(row);
    });

    expect(result.current.errorMessage).toBe(
      "Unexpected error updating model visibility"
    );
    expect(showSnackbarAlert).toHaveBeenCalledWith(
      "Unexpected error updating model visibility",
      "error"
    );
    await waitFor(() => expect(result.current.visibilityBusyId).toBeNull());
    consoleErrorSpy.mockRestore();
  });
});
