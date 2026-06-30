import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/services/auth.service", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    fetchProtectedDataForBootstrap: vi.fn(),
    applyModelForgeModelPackage: actual.applyModelForgeModelPackage,
  };
});

vi.mock("../../src/services/admin.service", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    applyModelForgeModelPackage: vi.fn(),
    getBackendHealth: vi.fn(),
    getCurrentModelManifestAdmin: vi.fn(),
    restartBackendAdmin: vi.fn(),
  };
});

import ApplyingBackendChangesPage from "../../src/pages/system/ApplyingBackendChangesPage.jsx";
import { renderWithProviders } from "../setup/renderWithProviders.jsx";
import { setPendingBackendChange } from "../../src/utils/pendingBackendChange.js";

const LocationProbe = () => {
  const location = useLocation();
  return <div>{`${location.pathname}${location.search}`}</div>;
};

const renderApplyingPage = () =>
  renderWithProviders(
    <Routes>
      <Route
        path="/system/applying-backend-changes"
        element={
          <>
            <ApplyingBackendChangesPage />
            <LocationProbe />
          </>
        }
      />
      <Route path="/dashboard/admin/models" element={<LocationProbe />} />
    </Routes>,
    {
      route: "/system/applying-backend-changes",
      authValue: {
        value: { role: "admin", isAdmin: true },
        isLoggedIn: true,
        setValue: vi.fn(),
        setIsLoggedIn: vi.fn(),
      },
    }
  );

describe("ApplyingBackendChangesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
    vi.useRealTimers();
  });

  it("renders stable applying copy and handles missing pending state safely", async () => {
    renderApplyingPage();

    expect(screen.getByText("Applying generated changes")).toBeInTheDocument();
    expect(
      screen.getByText(
        "The system is refreshing generated runtime files. You will be redirected automatically when everything is ready."
      )
    ).toBeInTheDocument();

    await waitFor(() =>
      expect(
        screen.getByText("No pending generated change was found.")
      ).toBeInTheDocument()
    );
    expect(
      screen.getByRole("button", { name: "Go to Admin Models anyway" })
    ).toBeInTheDocument();
  });

  it("renders stale state and allows navigation to the default destination", async () => {
    setPendingBackendChange({
      createdAt: 1,
      destinationPath: "/dashboard/admin/models?tab=manifest-sync",
    });

    const user = userEvent.setup();
    renderApplyingPage();

    await waitFor(() =>
      expect(
        screen.getByText("The pending generated change is stale.")
      ).toBeInTheDocument()
    );

    await user.click(screen.getByRole("button", { name: "Go to Admin Models anyway" }));

    await waitFor(() =>
      expect(
        screen.getAllByText("/dashboard/admin/models?tab=manifest-sync").length
      ).toBeGreaterThan(0)
    );
  });
});
