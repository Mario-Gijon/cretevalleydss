import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/context/issues/issues.provider", () => ({
  IssuesDataProvider: ({ children }) => <div data-testid="issues-provider">{children}</div>,
}));

vi.mock("../../src/components/GoUpButton/GoUpButton", () => ({
  GoUpButton: () => <div>go-up-button</div>,
}));

vi.mock("../../src/components/Account/Account", () => ({
  Account: () => <div>account-panel</div>,
}));

vi.mock("../../src/features/settings/components/AccountSettings", () => ({
  AccountSettings: () => <div>account-settings</div>,
}));

vi.mock("../../src/features/notifications/components/NotificationsDrawer", () => ({
  NotificationsDrawer: () => <div>notifications-drawer</div>,
}));

vi.mock("../../src/features/notifications/hooks/useNotificationsPanel", () => ({
  useNotificationsPanel: () => ({
    notifications: [],
    unreadCount: 0,
    openDrawer: false,
    openDialog: false,
    openNotificationsDrawer: vi.fn(),
    closeNotificationsDrawer: vi.fn(),
    openRemoveDialog: vi.fn(),
    closeRemoveDialog: vi.fn(),
    removeSelectedNotification: vi.fn(),
    handleInvitationAction: vi.fn(),
  }),
}));

vi.mock("../../src/components/ResponsiveNavbar/components/ResponsiveNavbarDesktopNav", () => ({
  ResponsiveNavbarDesktopNav: ({ navPages }) => (
    <div>{`desktop-nav:${navPages.map((page) => page.label).join(",")}`}</div>
  ),
}));

vi.mock("../../src/components/ResponsiveNavbar/components/ResponsiveNavbarMobileNav", () => ({
  ResponsiveNavbarMobileNav: () => <div>mobile-nav</div>,
}));

vi.mock("../../src/components/ResponsiveNavbar/components/ResponsiveNavbarUserMenu", () => ({
  ResponsiveNavbarUserMenu: ({ onCloseUserMenu }) => (
    <button type="button" onClick={() => onCloseUserMenu("Logout")}>
      logout option
    </button>
  ),
}));

vi.mock("../../src/components/ResponsiveNavbar/shared/ResponsiveNavbar.shared", () => ({
  HideOnScroll: ({ children }) => <>{children}</>,
}));

vi.mock("../../src/services/auth.service", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    logout: vi.fn(),
  };
});

vi.mock("../../src/assets/eu_dark.svg?react", () => ({
  default: () => null,
}));

vi.mock("../../src/assets/eu_light.svg?react", () => ({
  default: () => null,
}));

import PrivateLayout from "../../src/pages/private/PrivateLayout.jsx";
import { ResponsiveNavbar } from "../../src/components/ResponsiveNavbar/ResponsiveNavbar.jsx";
import { logout } from "../../src/services/auth.service";
import { renderWithProviders } from "../setup/renderWithProviders.jsx";

describe("PrivateLayout and navigation smoke", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the private shell, outlet content, and footer safely", async () => {
    renderWithProviders(
      <Routes>
        <Route path="/dashboard" element={<PrivateLayout />}>
          <Route index element={<div>private outlet content</div>} />
        </Route>
      </Routes>,
      { route: "/dashboard" }
    );

    expect(await screen.findByText("private outlet content")).toBeInTheDocument();
    expect(screen.getByTestId("issues-provider")).toBeInTheDocument();
    expect(screen.getByText("go-up-button")).toBeInTheDocument();
    expect(screen.getByText(/Co-funded by the European Union/)).toBeInTheDocument();
  });

  it("shows admin navigation only for admin users", () => {
    renderWithProviders(<ResponsiveNavbar />, {
      authValue: {
        value: { name: "Admin", role: "admin", isAdmin: true },
        setIsLoggedIn: vi.fn(),
      },
    });

    expect(screen.getByText("desktop-nav:Active,Finished,Create,Models,Admin")).toBeInTheDocument();
  });

  it("hides the admin navigation for non-admin users", () => {
    renderWithProviders(<ResponsiveNavbar />, {
      authValue: {
        value: { name: "User", role: "user", isAdmin: false },
        setIsLoggedIn: vi.fn(),
      },
    });

    expect(screen.getByText("desktop-nav:Active,Finished,Create,Models")).toBeInTheDocument();
    expect(screen.queryByText(/Admin/)).not.toBeInTheDocument();
  });

  it("calls logout and updates auth state from the confirmation flow", async () => {
    const user = userEvent.setup();
    const setIsLoggedIn = vi.fn();
    logout.mockResolvedValueOnce({
      success: true,
    });

    renderWithProviders(<ResponsiveNavbar />, {
      authValue: {
        value: { name: "Admin", role: "admin", isAdmin: true },
        setIsLoggedIn,
      },
    });

    await user.click(screen.getByRole("button", { name: "logout option" }));
    expect(await screen.findByRole("heading", { name: "Log out" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Logout" }));

    await waitFor(() => expect(logout).toHaveBeenCalledTimes(1));
    expect(setIsLoggedIn).toHaveBeenCalledWith(false);
  });
});
