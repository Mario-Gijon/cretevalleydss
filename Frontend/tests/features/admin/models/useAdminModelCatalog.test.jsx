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
  getAdminModelCatalog: vi.fn(),
}));

import useAdminModelCatalog from "../../../../src/features/admin/models/hooks/useAdminModelCatalog.js";
import { getAdminModelCatalog } from "../../../../src/services/admin.service";
import { buildAdminCatalogModelsFixture } from "../../../mocks/fixtures/adminModels.fixtures.js";

describe("useAdminModelCatalog", () => {
  const showSnackbarAlert = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSnackbarAlertContext.mockReturnValue({ showSnackbarAlert });
  });

  it("loads the admin model catalog on mount", async () => {
    const models = buildAdminCatalogModelsFixture();
    getAdminModelCatalog.mockResolvedValueOnce({
      success: true,
      data: { models },
    });

    const { result } = renderHook(() => useAdminModelCatalog());

    await waitFor(() => expect(result.current.loadingCatalog).toBe(false));

    expect(getAdminModelCatalog).toHaveBeenCalledTimes(1);
    expect(result.current.catalogModels).toEqual(models);
    expect(result.current.catalogError).toBe("");
  });

  it("stores an empty catalog when the response models field is missing or invalid", async () => {
    getAdminModelCatalog.mockResolvedValueOnce({
      success: true,
      data: { models: null },
    });

    const { result } = renderHook(() => useAdminModelCatalog());

    await waitFor(() => expect(result.current.loadingCatalog).toBe(false));

    expect(result.current.catalogModels).toEqual([]);
  });

  it("surfaces service failures with catalogError and snackbar", async () => {
    getAdminModelCatalog.mockResolvedValueOnce({
      success: false,
      message: "Error fetching model catalog",
    });

    const { result } = renderHook(() => useAdminModelCatalog());

    await waitFor(() => expect(result.current.loadingCatalog).toBe(false));

    expect(result.current.catalogError).toBe("Error fetching model catalog");
    expect(showSnackbarAlert).toHaveBeenCalledWith(
      "Error fetching model catalog",
      "error"
    );
    expect(result.current.catalogModels).toEqual([]);
  });

  it("handles unexpected thrown errors and resets loading", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    getAdminModelCatalog.mockRejectedValueOnce(new Error("boom"));

    const { result } = renderHook(() => useAdminModelCatalog());

    await waitFor(() => expect(result.current.loadingCatalog).toBe(false));

    expect(result.current.catalogError).toBe("Unexpected error fetching model catalog");
    expect(showSnackbarAlert).toHaveBeenCalledWith(
      "Unexpected error fetching model catalog",
      "error"
    );
    consoleErrorSpy.mockRestore();
  });

  it("supports quiet catalog refresh without toggling loading true", async () => {
    getAdminModelCatalog
      .mockResolvedValueOnce({
        success: true,
        data: { models: [] },
      })
      .mockResolvedValueOnce({
        success: true,
        data: { models: buildAdminCatalogModelsFixture() },
      });

    const { result } = renderHook(() => useAdminModelCatalog());

    await waitFor(() => expect(result.current.loadingCatalog).toBe(false));

    await act(async () => {
      const promise = result.current.loadCatalog({ quiet: true });
      expect(result.current.loadingCatalog).toBe(false);
      await promise;
    });

    expect(result.current.catalogModels).toEqual(buildAdminCatalogModelsFixture());
    expect(result.current.loadingCatalog).toBe(false);
  });
});
